-- Enable RLS on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Files policies: users can only access their own files
CREATE POLICY "Users can view own files"
ON public.files
FOR SELECT
TO authenticated
USING (user_id::uuid = auth.uid());

CREATE POLICY "Users can insert own files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (user_id::uuid = auth.uid());

CREATE POLICY "Users can update own files"
ON public.files
FOR UPDATE
TO authenticated
USING (user_id::uuid = auth.uid())
WITH CHECK (user_id::uuid = auth.uid());

CREATE POLICY "Users can delete own files"
ON public.files
FOR DELETE
TO authenticated
USING (user_id::uuid = auth.uid());

-- Owner and admin can view all files
CREATE POLICY "Owner and admin can view all files"
ON public.files
FOR SELECT
TO authenticated
USING (public.is_owner_or_admin(auth.uid()));

-- Enable RLS on vectors_data table
ALTER TABLE public.vectors_data ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read vectors_data (adjust based on your needs)
CREATE POLICY "Authenticated users can view vectors"
ON public.vectors_data
FOR SELECT
TO authenticated
USING (true);

-- Only owner/admin can modify vectors
CREATE POLICY "Owner and admin can manage vectors"
ON public.vectors_data
FOR ALL
TO authenticated
USING (public.is_owner_or_admin(auth.uid()))
WITH CHECK (public.is_owner_or_admin(auth.uid()));

-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;