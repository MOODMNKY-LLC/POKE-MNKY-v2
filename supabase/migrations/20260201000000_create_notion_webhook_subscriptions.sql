-- Notion Webhook Subscriptions table
-- Tracks Notion webhook subscriptions for Draft Board database

CREATE TABLE IF NOT EXISTS public.notion_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id TEXT NOT NULL UNIQUE,
  database_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  verification_token TEXT,
  last_verified_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notion_webhook_subscriptions_database_id 
  ON public.notion_webhook_subscriptions(database_id);
CREATE INDEX IF NOT EXISTS idx_notion_webhook_subscriptions_active 
  ON public.notion_webhook_subscriptions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_notion_webhook_subscriptions_created_at 
  ON public.notion_webhook_subscriptions(created_at DESC);

-- Enable RLS
ALTER TABLE public.notion_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read notion_webhook_subscriptions" 
  ON public.notion_webhook_subscriptions 
  FOR SELECT 
  USING (true);

-- Authenticated users can insert/update webhook subscriptions
CREATE POLICY "Authenticated insert notion_webhook_subscriptions" 
  ON public.notion_webhook_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update notion_webhook_subscriptions" 
  ON public.notion_webhook_subscriptions 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.notion_webhook_subscriptions IS 'Tracks Notion webhook subscriptions for Draft Board database synchronization';
