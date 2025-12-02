-- Create vapi_calls table for persistent call history storage
CREATE TABLE IF NOT EXISTS public.vapi_calls (
  id TEXT PRIMARY KEY,
  type TEXT,
  status TEXT,
  customer_number TEXT,
  customer_name TEXT,
  phone_number_id TEXT,
  phone_number TEXT,
  assistant_id TEXT,
  duration INTEGER,
  cost NUMERIC,
  cost_breakdown JSONB,
  ended_reason TEXT,
  transcript TEXT,
  recording_url TEXT,
  summary TEXT,
  messages JSONB,
  analysis JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vapi_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vapi_calls
CREATE POLICY "Users can view own calls"
  ON public.vapi_calls
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner and admin can view all calls"
  ON public.vapi_calls
  FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "System can insert calls"
  ON public.vapi_calls
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update calls"
  ON public.vapi_calls
  FOR UPDATE
  USING (true);

-- Create indexes for efficient querying
CREATE INDEX idx_vapi_calls_user_id ON public.vapi_calls(user_id);
CREATE INDEX idx_vapi_calls_status ON public.vapi_calls(status);
CREATE INDEX idx_vapi_calls_started_at ON public.vapi_calls(started_at DESC);
CREATE INDEX idx_vapi_calls_assistant_id ON public.vapi_calls(assistant_id);

-- Create vapi_files table to track files uploaded to Vapi
CREATE TABLE IF NOT EXISTS public.vapi_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_file_id TEXT UNIQUE,
  local_file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  vapi_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vapi_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vapi_files
CREATE POLICY "Users can view own vapi files"
  ON public.vapi_files
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner and admin can view all vapi files"
  ON public.vapi_files
  FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can insert own vapi files"
  ON public.vapi_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vapi files"
  ON public.vapi_files
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vapi files"
  ON public.vapi_files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_vapi_files_user_id ON public.vapi_files(user_id);
CREATE INDEX idx_vapi_files_local_file_id ON public.vapi_files(local_file_id);
CREATE INDEX idx_vapi_files_status ON public.vapi_files(status);

-- Create vapi_knowledge_bases table
CREATE TABLE IF NOT EXISTS public.vapi_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_kb_id TEXT UNIQUE,
  name TEXT NOT NULL,
  file_ids TEXT[],
  assistant_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vapi_knowledge_bases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vapi_knowledge_bases
CREATE POLICY "Users can view own knowledge bases"
  ON public.vapi_knowledge_bases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner and admin can view all knowledge bases"
  ON public.vapi_knowledge_bases
  FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can insert own knowledge bases"
  ON public.vapi_knowledge_bases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge bases"
  ON public.vapi_knowledge_bases
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge bases"
  ON public.vapi_knowledge_bases
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_vapi_kb_user_id ON public.vapi_knowledge_bases(user_id);
CREATE INDEX idx_vapi_kb_assistant_id ON public.vapi_knowledge_bases(assistant_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_vapi_calls_updated_at
  BEFORE UPDATE ON public.vapi_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vapi_files_updated_at
  BEFORE UPDATE ON public.vapi_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vapi_knowledge_bases_updated_at
  BEFORE UPDATE ON public.vapi_knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();