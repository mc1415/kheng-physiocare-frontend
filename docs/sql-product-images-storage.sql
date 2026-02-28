-- Ensure product image column exists
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket (public) if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read access for product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read product-images'
  ) THEN
    CREATE POLICY "Public read product-images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Allow anon uploads to product-images (for current admin setup using anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon upload product-images'
  ) THEN
    CREATE POLICY "Anon upload product-images"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

-- Allow anon updates/deletes in product-images (optional, for replacing images)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon update product-images'
  ) THEN
    CREATE POLICY "Anon update product-images"
    ON storage.objects
    FOR UPDATE
    TO anon
    USING (bucket_id = 'product-images')
    WITH CHECK (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon delete product-images'
  ) THEN
    CREATE POLICY "Anon delete product-images"
    ON storage.objects
    FOR DELETE
    TO anon
    USING (bucket_id = 'product-images');
  END IF;
END $$;
