-- Create orders table for structured order data from Vapi function calls
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  customer_name TEXT,
  customer_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  estimated_time INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owner and admin can view all orders"
ON public.orders
FOR SELECT
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update orders"
ON public.orders
FOR UPDATE
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_orders_call_id ON public.orders(call_id);
CREATE INDEX idx_orders_customer_number ON public.orders(customer_number);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();