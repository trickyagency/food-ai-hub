-- Create table for Vapi webhook events (real-time call data)
CREATE TABLE public.vapi_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT,
  call_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  assistant_id TEXT,
  phone_number_id TEXT,
  customer_number TEXT,
  transcript_text TEXT,
  call_status TEXT,
  duration INTEGER,
  cost DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID
);

-- Create indexes for better query performance
CREATE INDEX idx_vapi_call_events_call_id ON public.vapi_call_events(call_id);
CREATE INDEX idx_vapi_call_events_event_type ON public.vapi_call_events(event_type);
CREATE INDEX idx_vapi_call_events_created_at ON public.vapi_call_events(created_at DESC);
CREATE INDEX idx_vapi_call_events_user_id ON public.vapi_call_events(user_id);

-- Enable Row Level Security
ALTER TABLE public.vapi_call_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own call events"
  ON public.vapi_call_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner and admin can view all call events"
  ON public.vapi_call_events FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "System can insert call events"
  ON public.vapi_call_events FOR INSERT
  WITH CHECK (true);

-- Create table to cache Vapi assistants
CREATE TABLE public.vapi_assistants_cache (
  id TEXT PRIMARY KEY,
  name TEXT,
  model JSONB,
  voice JSONB,
  first_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL,
  full_data JSONB
);

-- Enable RLS on assistants cache
ALTER TABLE public.vapi_assistants_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assistants"
  ON public.vapi_assistants_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own assistants"
  ON public.vapi_assistants_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create table to cache Vapi phone numbers
CREATE TABLE public.vapi_phone_numbers_cache (
  id TEXT PRIMARY KEY,
  number TEXT,
  name TEXT,
  assistant_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL,
  full_data JSONB
);

-- Enable RLS on phone numbers cache
ALTER TABLE public.vapi_phone_numbers_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phone numbers"
  ON public.vapi_phone_numbers_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own phone numbers"
  ON public.vapi_phone_numbers_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for vapi_call_events table
ALTER TABLE public.vapi_call_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vapi_call_events;