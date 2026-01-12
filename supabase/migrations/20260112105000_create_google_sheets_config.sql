-- Google Sheets Configuration table
-- Stores sync configuration for Google Sheets integration

CREATE TABLE IF NOT EXISTS public.google_sheets_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id TEXT NOT NULL,
  service_account_email TEXT, -- Optional: Uses GOOGLE_SERVICE_ACCOUNT_EMAIL env var if not provided
  service_account_private_key TEXT, -- Optional: Uses GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_PRIVATE_KEY env var if not provided
  enabled BOOLEAN DEFAULT true,
  sync_schedule TEXT DEFAULT 'manual', -- 'manual', 'hourly', 'daily', 'weekly'
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'partial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Sheet mappings table for flexible sheet-to-table mapping
CREATE TABLE IF NOT EXISTS public.sheet_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES public.google_sheets_config(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL, -- Name of the sheet tab in Google Sheets
  table_name TEXT NOT NULL, -- Target Supabase table name
  range TEXT DEFAULT 'A:Z', -- Sheet range to sync (e.g., 'A1:Z1000')
  enabled BOOLEAN DEFAULT true,
  sync_order INTEGER DEFAULT 0, -- Order in which sheets are synced
  column_mapping JSONB DEFAULT '{}'::jsonb, -- Maps sheet columns to table columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, sheet_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_sheets_config_enabled ON public.google_sheets_config(enabled);
CREATE INDEX IF NOT EXISTS idx_sheet_mappings_config ON public.sheet_mappings(config_id);
CREATE INDEX IF NOT EXISTS idx_sheet_mappings_order ON public.sheet_mappings(config_id, sync_order);

-- Enable RLS
ALTER TABLE public.google_sheets_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_mappings ENABLE ROW LEVEL SECURITY;

-- Policies: Only authenticated users can read, only admins can write
CREATE POLICY "Public read google_sheets_config" ON public.google_sheets_config FOR SELECT USING (true);
CREATE POLICY "Authenticated insert google_sheets_config" ON public.google_sheets_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update google_sheets_config" ON public.google_sheets_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete google_sheets_config" ON public.google_sheets_config FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public read sheet_mappings" ON public.sheet_mappings FOR SELECT USING (true);
CREATE POLICY "Authenticated insert sheet_mappings" ON public.sheet_mappings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update sheet_mappings" ON public.sheet_mappings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete sheet_mappings" ON public.sheet_mappings FOR DELETE USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_google_sheets_config_updated_at
  BEFORE UPDATE ON public.google_sheets_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheet_mappings_updated_at
  BEFORE UPDATE ON public.sheet_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
