-- Update admin policies to include manager role
DROP POLICY IF EXISTS "Admin can manage staff roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update staff roles" ON public.user_roles;

CREATE POLICY "Admin can manage non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) 
  AND role IN ('staff'::app_role, 'manager'::app_role, 'viewer'::app_role)
);

CREATE POLICY "Admin can update non-privileged roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  AND role IN ('staff'::app_role, 'manager'::app_role, 'viewer'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) 
  AND role IN ('staff'::app_role, 'manager'::app_role, 'viewer'::app_role)
);