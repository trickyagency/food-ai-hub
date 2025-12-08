-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create a policy that allows users to view only their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Create a policy for owners/admins to view all profiles (for user management)
CREATE POLICY "Owner and admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_owner_or_admin(auth.uid()));