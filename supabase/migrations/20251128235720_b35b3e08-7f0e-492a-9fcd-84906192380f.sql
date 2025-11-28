-- Create user_role_history table to track all role changes
CREATE TABLE public.user_role_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;

-- Policy: Owner and admin can view all role history
CREATE POLICY "Owner and admin can view all role history"
ON public.user_role_history
FOR SELECT
TO authenticated
USING (is_owner_or_admin(auth.uid()));

-- Policy: Users can view their own role history
CREATE POLICY "Users can view own role history"
ON public.user_role_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Owner and admin can insert role history
CREATE POLICY "Owner and admin can insert role history"
ON public.user_role_history
FOR INSERT
TO authenticated
WITH CHECK (is_owner_or_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_user_role_history_user_id ON public.user_role_history(user_id);
CREATE INDEX idx_user_role_history_changed_at ON public.user_role_history(changed_at DESC);