-- Set trickyhubagency@gmail.com as admin
-- First, check if the user exists and insert the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'trickyhubagency@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';