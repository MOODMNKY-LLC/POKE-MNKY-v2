-- Migration: Team Validation Database Function
-- Purpose: Centralize team validation logic in database for consistent rule enforcement
-- Date: 2026-01-15

-- Create function to validate team composition against league rules
CREATE OR REPLACE FUNCTION public.validate_team_composition(
    p_team_text TEXT,
    p_coach_id UUID,
    p_season_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_validation_result JSONB;
    v_errors TEXT[] := ARRAY[]::TEXT[];
    v_warnings TEXT[] := ARRAY[]::TEXT[];
    v_pokemon_count INTEGER := 0;
    v_pokemon_names TEXT[] := ARRAY[]::TEXT[];
    v_team_id UUID;
    v_drafted_pokemon TEXT[];
    v_pokemon_record RECORD;
    v_line TEXT;
    v_pokemon_name TEXT;
    v_item_count JSONB := '{}'::JSONB;
    v_item_name TEXT;
    v_validation_passed BOOLEAN := true;
BEGIN
    -- Initialize result structure
    v_validation_result := jsonb_build_object(
        'valid', false,
        'errors', ARRAY[]::TEXT[],
        'warnings', ARRAY[]::TEXT[],
        'pokemon_count', 0,
        'pokemon_list', ARRAY[]::TEXT[]
    );
    
    -- Get team ID for the coach and season
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE coach_id = p_coach_id
    AND season_id = p_season_id
    LIMIT 1;
    
    IF v_team_id IS NULL THEN
        v_errors := array_append(v_errors, 'No team found for coach in this season');
        v_validation_result := jsonb_set(
            v_validation_result,
            '{errors}',
            to_jsonb(v_errors)
        );
        RETURN v_validation_result;
    END IF;
    
    -- Get drafted Pokemon for this team (join through pokemon table to get names)
    SELECT ARRAY_AGG(LOWER(p.name)) INTO v_drafted_pokemon
    FROM public.team_rosters tr
    JOIN public.pokemon p ON p.id = tr.pokemon_id
    WHERE tr.team_id = v_team_id;
    
    IF v_drafted_pokemon IS NULL THEN
        v_drafted_pokemon := ARRAY[]::TEXT[];
    END IF;
    
    -- Parse team text (basic parsing - assumes Showdown format)
    -- Format: Pokemon @ Item / Ability / EVs / Nature / Moves
    FOR v_line IN SELECT unnest(string_to_array(p_team_text, E'\n'))
    LOOP
        -- Skip empty lines and comments
        IF trim(v_line) = '' OR trim(v_line) LIKE '===%' OR trim(v_line) LIKE '---%' THEN
            CONTINUE;
        END IF;
        
        -- Extract Pokemon name (first word before @ or /)
        v_pokemon_name := trim(split_part(split_part(v_line, '@', 1), '/', 1));
        
        -- Clean up Pokemon name (remove gender symbols, form indicators, etc.)
        v_pokemon_name := regexp_replace(v_pokemon_name, '[MFN]', '', 'g');
        v_pokemon_name := regexp_replace(v_pokemon_name, '-.*$', '');
        v_pokemon_name := trim(lower(v_pokemon_name));
        
        IF v_pokemon_name != '' THEN
            v_pokemon_count := v_pokemon_count + 1;
            v_pokemon_names := array_append(v_pokemon_names, v_pokemon_name);
            
            -- Check if Pokemon is in drafted roster
            IF NOT (v_pokemon_name = ANY(v_drafted_pokemon)) THEN
                v_errors := array_append(
                    v_errors, 
                    format('Pokemon "%s" is not in your drafted roster', v_pokemon_name)
                );
                v_validation_passed := false;
            END IF;
            
            -- Extract item (between @ and /)
            IF v_line LIKE '%@%' THEN
                v_item_name := trim(split_part(split_part(v_line, '@', 2), '/', 1));
                IF v_item_name != '' THEN
                    v_item_count := jsonb_set(
                        v_item_count,
                        ARRAY[v_item_name],
                        to_jsonb(COALESCE((v_item_count->>v_item_name)::INTEGER, 0) + 1)
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- Validate Pokemon count (league rules: 8-10 Pokemon)
    IF v_pokemon_count < 8 THEN
        v_errors := array_append(
            v_errors,
            format('Team must have at least 8 Pokemon (found %s)', v_pokemon_count)
        );
        v_validation_passed := false;
    ELSIF v_pokemon_count > 10 THEN
        v_errors := array_append(
            v_errors,
            format('Team cannot have more than 10 Pokemon (found %s)', v_pokemon_count)
        );
        v_validation_passed := false;
    END IF;
    
    -- Validate item restrictions (max 2 of same item)
    FOR v_item_name IN SELECT jsonb_object_keys(v_item_count)
    LOOP
        IF (v_item_count->>v_item_name)::INTEGER > 2 THEN
            v_errors := array_append(
                v_errors,
                format('Cannot use more than 2 "%s" items (found %s)', 
                       v_item_name, 
                       v_item_count->>v_item_name)
            );
            v_validation_passed := false;
        END IF;
    END LOOP;
    
    -- Check for duplicate Pokemon
    IF array_length(v_pokemon_names, 1) != array_length(array(SELECT DISTINCT unnest(v_pokemon_names)), 1) THEN
        v_errors := array_append(
            v_errors,
            'Team contains duplicate Pokemon'
        );
        v_validation_passed := false;
    END IF;
    
    -- Build final result
    v_validation_result := jsonb_build_object(
        'valid', v_validation_passed,
        'errors', v_errors,
        'warnings', v_warnings,
        'pokemon_count', v_pokemon_count,
        'pokemon_list', v_pokemon_names,
        'team_id', v_team_id,
        'season_id', p_season_id
    );
    
    RETURN v_validation_result;
END;
$$;

-- Create function to validate and update team validation status
CREATE OR REPLACE FUNCTION public.validate_and_update_team(
    p_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_team RECORD;
    v_validation_result JSONB;
    v_errors TEXT[];
BEGIN
    -- Get team data
    SELECT 
        id,
        team_text,
        coach_id,
        season_id,
        pokemon_data
    INTO v_team
    FROM public.showdown_teams
    WHERE id = p_team_id;
    
    IF v_team.id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'errors', ARRAY['Team not found']::TEXT[]
        );
    END IF;
    
    -- Validate team composition
    v_validation_result := public.validate_team_composition(
        v_team.team_text,
        v_team.coach_id,
        v_team.season_id
    );
    
    -- Extract errors
    v_errors := ARRAY(SELECT jsonb_array_elements_text(v_validation_result->'errors'));
    
    -- Update team validation status
    UPDATE public.showdown_teams
    SET 
        is_validated = (v_validation_result->>'valid')::BOOLEAN,
        validation_errors = v_errors,
        updated_at = NOW()
    WHERE id = p_team_id;
    
    RETURN v_validation_result;
END;
$$;

-- Create trigger to auto-validate teams on insert/update
CREATE OR REPLACE FUNCTION public.auto_validate_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_validation_result JSONB;
BEGIN
    -- Only validate if team_text changed and coach/season are set
    IF NEW.team_text IS NOT NULL 
       AND NEW.coach_id IS NOT NULL 
       AND NEW.season_id IS NOT NULL 
       AND (OLD.team_text IS NULL OR OLD.team_text != NEW.team_text) THEN
        
        v_validation_result := public.validate_team_composition(
            NEW.team_text,
            NEW.coach_id,
            NEW.season_id
        );
        
        -- Update validation status
        NEW.is_validated := (v_validation_result->>'valid')::BOOLEAN;
        NEW.validation_errors := ARRAY(SELECT jsonb_array_elements_text(v_validation_result->'errors'));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_validate_team
    BEFORE INSERT OR UPDATE OF team_text, coach_id, season_id ON public.showdown_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_validate_team();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_team_composition(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_team_composition(TEXT, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_and_update_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_update_team(UUID) TO service_role;

-- Comments
COMMENT ON FUNCTION public.validate_team_composition(TEXT, UUID, UUID) IS 
'Validates team composition against league rules: checks drafted Pokemon, team size (8-10), item restrictions (max 2), and duplicate Pokemon.';

COMMENT ON FUNCTION public.validate_and_update_team(UUID) IS 
'Validates a team and updates its validation status in the database.';

COMMENT ON FUNCTION public.auto_validate_team() IS 
'Automatically validates teams when team_text, coach_id, or season_id changes.';
