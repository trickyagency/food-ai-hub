-- Fix function search_path security issue
-- Drop trigger first
DROP TRIGGER IF EXISTS update_call_summaries_timestamp ON public.call_summaries;

-- Drop and recreate function with proper security settings
DROP FUNCTION IF EXISTS public.update_call_summaries_updated_at();

CREATE OR REPLACE FUNCTION public.update_call_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_call_summaries_timestamp
  BEFORE UPDATE ON public.call_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_summaries_updated_at();