-- Enable realtime for audit_logs table
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;