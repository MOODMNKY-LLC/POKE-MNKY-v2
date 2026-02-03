-- Discord Notification Log table
-- Tracks Discord webhook notifications sent for draft board sync events

-- Use gen_random_uuid() which is built-in to PostgreSQL
CREATE TABLE IF NOT EXISTS public.discord_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discord_notification_log_webhook_name 
  ON public.discord_notification_log(webhook_name);
CREATE INDEX IF NOT EXISTS idx_discord_notification_log_event_type 
  ON public.discord_notification_log(event_type);
CREATE INDEX IF NOT EXISTS idx_discord_notification_log_sent_at 
  ON public.discord_notification_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_notification_log_success 
  ON public.discord_notification_log(success) WHERE success = false;

-- Enable RLS
ALTER TABLE public.discord_notification_log ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read discord_notification_log" 
  ON public.discord_notification_log 
  FOR SELECT 
  USING (true);

-- Authenticated users can insert notification logs
CREATE POLICY "Authenticated insert discord_notification_log" 
  ON public.discord_notification_log 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.discord_notification_log IS 'Logs Discord webhook notifications for draft board sync events and errors';
