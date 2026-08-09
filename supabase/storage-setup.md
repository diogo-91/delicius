# Supabase Storage setup

Run `supabase/migrations/004_storage_assets.sql` in the Supabase SQL Editor.

It creates the public bucket:

- `restaurant-assets`

And enables:

- public read access for product images
- authenticated upload/update/delete under `restaurants/...`
- 5 MB image limit
- JPG, PNG, WebP and GIF only

After running it, uploads from `/dashboard/produtos` will use Supabase Storage as the primary destination.
