-- Create call_tags table to store tags and metadata for Vapi calls
CREATE TABLE IF NOT EXISTS public.call_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sales', 'support', 'follow-up', 'general')),
  notes TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(call_id, user_id)
);

-- Enable RLS
ALTER TABLE public.call_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own call tags"
  ON public.call_tags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call tags"
  ON public.call_tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call tags"
  ON public.call_tags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own call tags"
  ON public.call_tags
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner and admin can view all call tags"
  ON public.call_tags
  FOR SELECT
  USING (is_owner_or_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_call_tags_call_id ON public.call_tags(call_id);
CREATE INDEX idx_call_tags_category ON public.call_tags(category);
CREATE INDEX idx_call_tags_user_id ON public.call_tags(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_call_tags_updated_at
  BEFORE UPDATE ON public.call_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for call_tags table
ALTER TABLE public.call_tags REPLICA IDENTITY FULL;