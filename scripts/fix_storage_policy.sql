-- Make the avatars bucket fully open for uploads to ensure no RLS errors block the upload
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;

CREATE POLICY "Anyone can upload an avatar." 
ON storage.objects FOR INSERT 
TO public
WITH CHECK ( bucket_id = 'avatars' );
