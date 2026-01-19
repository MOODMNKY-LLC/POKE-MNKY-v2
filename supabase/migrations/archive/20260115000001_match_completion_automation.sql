-- Migration: Match Completion Automation Triggers
-- Purpose: Automate standings updates and real-time broadcasts when matches complete
-- Date: 2026-01-15

-- Enable required extensions for webhooks
-- Note: realtime is provided by Supabase infrastructure, not as a PostgreSQL extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to broadcast match updates via Realtime
-- Note: realtime.send() is available in production Supabase but may not be in local dev
CREATE OR REPLACE FUNCTION public.broadcast_match_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    topic_name TEXT;
    event_payload JSONB;
BEGIN
    -- Only broadcast when match status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Build topic name: match:{match_id}:updates
        topic_name := 'match:' || NEW.id::TEXT || ':updates';
        
        -- Build event payload
        event_payload := jsonb_build_object(
            'match_id', NEW.id,
            'status', NEW.status,
            'winner_id', NEW.winner_id,
            'team1_score', NEW.team1_score,
            'team2_score', NEW.team2_score,
            'differential', NEW.differential,
            'season_id', NEW.season_id,
            'week', NEW.week,
            'updated_at', NOW()
        );
        
        -- Broadcast to Realtime channel (if available)
        BEGIN
            PERFORM realtime.send(
                topic_name,
                'match_completed',
                event_payload,
                true  -- private channel
            );
        EXCEPTION WHEN OTHERS THEN
            -- Realtime not available (e.g., local dev), skip broadcast
            NULL;
        END;
        
        -- Also broadcast to season-wide standings channel
        IF NEW.season_id IS NOT NULL THEN
            BEGIN
                PERFORM realtime.send(
                    'standings:' || NEW.season_id::TEXT || ':updates',
                    'standings_updated',
                    jsonb_build_object(
                        'season_id', NEW.season_id,
                        'match_id', NEW.id,
                        'updated_at', NOW()
                    ),
                    true  -- private channel
                );
            EXCEPTION WHEN OTHERS THEN
                -- Realtime not available, skip broadcast
                NULL;
            END;
        END IF;
    END IF;
    
    -- Broadcast any match update
    topic_name := 'match:' || NEW.id::TEXT || ':updates';
    event_payload := jsonb_build_object(
        'match_id', NEW.id,
        'status', NEW.status,
        'updated_at', NOW()
    );
    
    BEGIN
        PERFORM realtime.send(
            topic_name,
            'match_updated',
            event_payload,
            true  -- private channel
        );
    EXCEPTION WHEN OTHERS THEN
        -- Realtime not available, skip broadcast
        NULL;
    END;
    
    RETURN NEW;
END;
$$;

-- Create function to refresh standings after match completion
CREATE OR REPLACE FUNCTION public.refresh_standings_on_match_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only refresh when match status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Refresh standings materialized view
        -- Use a background job approach to avoid blocking the transaction
        -- For now, refresh directly (can be moved to pgmq queue later)
        PERFORM public.refresh_standings_materialized_view();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for match updates
CREATE TRIGGER trigger_broadcast_match_updates
    AFTER INSERT OR UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_match_update();

-- Create trigger for standings refresh
CREATE TRIGGER trigger_refresh_standings_on_completion
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
    EXECUTE FUNCTION public.refresh_standings_on_match_completion();

-- Create RLS policies for Realtime messages
-- Allow authenticated users to receive match updates for matches they're involved in
CREATE POLICY "Users can receive match broadcasts"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
        -- Match updates: users can see matches involving their teams
        (topic LIKE 'match:%:updates' AND EXISTS (
            SELECT 1 FROM public.matches m
            JOIN public.teams t1 ON t1.id = m.team1_id
            JOIN public.teams t2 ON t2.id = m.team2_id
            WHERE m.id::TEXT = SPLIT_PART(topic, ':', 2)
            AND (
                t1.coach_id = auth.uid() 
                OR t2.coach_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'commissioner')
                )
            )
        ))
        OR
        -- Standings updates: authenticated users can see standings for seasons they're in
        (topic LIKE 'standings:%:updates' AND EXISTS (
            SELECT 1 FROM public.seasons s
            JOIN public.teams t ON t.season_id = s.id
            WHERE s.id::TEXT = SPLIT_PART(topic, ':', 2)
            AND (
                t.coach_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'commissioner')
                )
            )
        ))
    );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.broadcast_match_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_standings_on_match_completion() TO service_role;

-- Comments
COMMENT ON FUNCTION public.broadcast_match_update() IS 
'Broadcasts match updates to Realtime channels when matches are created or updated.';

COMMENT ON FUNCTION public.refresh_standings_on_match_completion() IS 
'Automatically refreshes standings materialized view when matches are completed.';

-- Note: Trigger comments added after trigger creation to avoid errors if triggers fail
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_broadcast_match_updates') THEN
        COMMENT ON TRIGGER trigger_broadcast_match_updates ON public.matches IS 
        'Broadcasts match updates to Realtime channels for real-time UI updates.';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_refresh_standings_on_match_completion') THEN
        COMMENT ON TRIGGER trigger_refresh_standings_on_match_completion ON public.matches IS 
        'Automatically refreshes standings when matches are completed.';
    END IF;
END $$;
