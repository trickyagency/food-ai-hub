-- Create storage bucket for database files
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-files', 'database-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for database-files bucket
CREATE POLICY "Admins can upload database files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'database-files' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Admins can view database files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'database-files' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Admins can delete database files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'database-files' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_vectors(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    vectors_data.id,
    vectors_data.content,
    vectors_data.metadata,
    1 - (vectors_data.embedding <=> query_embedding) AS similarity
  FROM vectors_data
  WHERE 1 - (vectors_data.embedding <=> query_embedding) > match_threshold
  ORDER BY vectors_data.embedding <=> query_embedding
  LIMIT match_count;
$$;