-- Storage policies for the "product-images" bucket (created via supabaseAdmin.storage.createBucket,
-- public: true, so anon SELECT/reads already work via public URLs; these policies gate writes).
BEGIN;

DROP POLICY IF EXISTS "Product images are viewable by everyone" ON storage.objects;
CREATE POLICY "Product images are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

COMMIT;
