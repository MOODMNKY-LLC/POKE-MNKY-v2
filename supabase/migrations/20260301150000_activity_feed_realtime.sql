-- Broadcast activity feed events to user channel for dashboard realtime updates.
-- Topic: user:{user_id}:activity. Event: activity_created.
-- Clients subscribe to their own channel to show live Recent Activity.

CREATE OR REPLACE FUNCTION notify_activity_feed_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  topic text;
  payload jsonb;
BEGIN
  topic := 'user:' || COALESCE(NEW.user_id::text, '');
  IF topic = 'user:' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'id', NEW.id,
    'action', NEW.action,
    'resource_type', NEW.resource_type,
    'resource_id', NEW.resource_id,
    'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
    'created_at', NEW.created_at
  );

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
      PERFORM realtime.send(topic, 'activity_created', payload);
    ELSE
      PERFORM pg_notify('user_activity_feed', payload::text);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_notify('user_activity_feed', payload::text);
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_activity_feed_broadcast ON public.user_activity_log;
CREATE TRIGGER trigger_activity_feed_broadcast
  AFTER INSERT ON public.user_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_feed_insert();

COMMENT ON FUNCTION notify_activity_feed_insert() IS 'Broadcasts new user_activity_log rows to user:{user_id}:activity for dashboard realtime.';
