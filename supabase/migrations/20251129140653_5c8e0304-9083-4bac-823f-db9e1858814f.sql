-- Fix jwt_custom_claims function to have fixed search_path
CREATE OR REPLACE FUNCTION public.jwt_custom_claims()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'role',
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
  );
$$;