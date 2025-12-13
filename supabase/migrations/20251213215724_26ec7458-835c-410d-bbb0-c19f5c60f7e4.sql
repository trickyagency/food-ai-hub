-- Create order_status_history table to track status changes
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient order history lookups
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owner and admin can view all order history"
ON public.order_status_history
FOR SELECT
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can view order history for their orders"
ON public.order_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert order history"
ON public.order_status_history
FOR INSERT
WITH CHECK (true);

-- Enable Realtime for live updates
ALTER TABLE public.order_status_history REPLICA IDENTITY FULL;