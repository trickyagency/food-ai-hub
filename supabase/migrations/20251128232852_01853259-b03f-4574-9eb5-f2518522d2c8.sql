-- Fix security warning: Set search_path for match_vectors function
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
SECURITY DEFINER
SET search_path = public
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