-- Adds profile photo + preferred payment method support for the customer
-- profile page. The "avatars" storage bucket itself is created separately via
-- supabaseAdmin.storage.createBucket (buckets aren't created through SQL
-- migrations in this project — see 00003's comment on "product-images" for the
-- same pattern); this migration only adds the columns and the RLS policies
-- gating access to that bucket once it exists. Idempotent, safe to re-run.

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment TEXT NOT NULL DEFAULT 'cod';

-- Avatars are stored at "<user_id>/<filename>" so these policies can scope
-- writes to "your own folder only" via storage.foldername(name).
DROP POLICY IF EXISTS "Avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Avatars are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
