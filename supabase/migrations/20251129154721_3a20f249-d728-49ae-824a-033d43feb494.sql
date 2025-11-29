-- Enable realtime for file_upload_history table
ALTER TABLE public.file_upload_history REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_upload_history;