-- Create a function to auto-assign owner role to first user if no owner exists
CREATE OR REPLACE FUNCTION public.auto_assign_first_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if any owner exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    -- No owner exists, make this user the owner
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (NEW.id, 'owner', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run after new user is created in auth.users
CREATE TRIGGER on_auth_user_created_assign_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_first_owner();