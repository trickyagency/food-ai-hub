-- Create webhook_responses table to track all file uploads to n8n
CREATE TABLE public.webhook_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  webhook_url TEXT NOT NULL,
  status_code INTEGER,
  response_body JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Owner and admin can view all webhook responses
CREATE POLICY "Owner and admin can view all webhook responses"
ON public.webhook_responses
FOR SELECT
TO authenticated
USING (is_owner_or_admin(auth.uid()));

-- Policy: Users can view own webhook responses
CREATE POLICY "Users can view own webhook responses"
ON public.webhook_responses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert own webhook responses
CREATE POLICY "Users can insert own webhook responses"
ON public.webhook_responses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_webhook_responses_user_id ON public.webhook_responses(user_id);
CREATE INDEX idx_webhook_responses_created_at ON public.webhook_responses(created_at DESC);