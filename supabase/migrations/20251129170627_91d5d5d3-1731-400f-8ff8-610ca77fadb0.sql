-- Make database-files bucket public to allow direct URL access for n8n
UPDATE storage.buckets 
SET public = true 
WHERE id = 'database-files';