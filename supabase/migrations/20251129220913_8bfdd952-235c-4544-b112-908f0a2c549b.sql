-- Create table to store AI-generated call summaries
CREATE TABLE IF NOT EXISTS public.call_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT[],
  action_items TEXT[],
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own call summaries"
  ON public.call_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call summaries"
  ON public.call_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call summaries"
  ON public.call_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call summaries"
  ON public.call_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_call_summaries_call_id ON public.call_summaries(call_id);
CREATE INDEX idx_call_summaries_user_id ON public.call_summaries(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_call_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_summaries_timestamp
  BEFORE UPDATE ON public.call_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_summaries_updated_at();