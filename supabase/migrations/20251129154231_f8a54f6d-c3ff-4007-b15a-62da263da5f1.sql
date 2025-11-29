-- Create file upload history table
CREATE TABLE public.file_upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  user_id uuid NOT NULL,
  upload_status text NOT NULL, -- 'pending', 'uploading', 'success', 'failed'
  webhook_url text,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.file_upload_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own upload history
CREATE POLICY "Users can view own upload history"
ON public.file_upload_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owner and admin can view all upload history
CREATE POLICY "Owner and admin can view all upload history"
ON public.file_upload_history
FOR SELECT
TO authenticated
USING (is_owner_or_admin(auth.uid()));

-- Users can insert their own upload history
CREATE POLICY "Users can insert own upload history"
ON public.file_upload_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own upload history
CREATE POLICY "Users can update own upload history"
ON public.file_upload_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_file_upload_history_user_id ON public.file_upload_history(user_id);
CREATE INDEX idx_file_upload_history_file_id ON public.file_upload_history(file_id);
CREATE INDEX idx_file_upload_history_created_at ON public.file_upload_history(created_at DESC);