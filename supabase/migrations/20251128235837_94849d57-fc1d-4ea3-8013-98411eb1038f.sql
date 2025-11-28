-- Add foreign key for changed_by in user_role_history
ALTER TABLE public.user_role_history
ADD CONSTRAINT user_role_history_changed_by_fkey
FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;