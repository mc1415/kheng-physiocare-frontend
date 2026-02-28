-- Add product image support
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.products.image_url IS
'Product image URL or base64 data URL for display in admin and store pages.';
