-- Create sms_logs table to track sent SMS messages
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT,
  customer_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  order_details JSONB,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owner and admin can view all sms logs"
ON public.sms_logs
FOR SELECT
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can view own sms logs"
ON public.sms_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert sms logs"
ON public.sms_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update sms logs"
ON public.sms_logs
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_sms_logs_call_id ON public.sms_logs(call_id);
CREATE INDEX idx_sms_logs_customer_number ON public.sms_logs(customer_number);
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs(created_at DESC);