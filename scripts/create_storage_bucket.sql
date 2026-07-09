-- ==========================================
-- AVATARS STORAGE BUCKET SETUP
-- ==========================================

-- 1. Create the public "avatars" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to ensure clean slate (if you run this multiple times)
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;

-- 3. Policy: Anyone on the internet can VIEW the avatars (needed for the Leaderboard)
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- 4. Policy: Authenticated users can UPLOAD an avatar
CREATE POLICY "Anyone can upload an avatar." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 5. Policy: Users can UPDATE or OVERWRITE their own avatar
CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE 
USING ( auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' );
