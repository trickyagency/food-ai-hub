-- Add delivery address and order type columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'pickup';

-- Add check constraint for order_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
      CHECK (order_type IN ('pickup', 'delivery'));
  END IF;
END $$;