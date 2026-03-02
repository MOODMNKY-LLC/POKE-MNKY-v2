# Profile & Team Storage Buckets

Storage buckets used by the profile section and Coach Card.

## team-assets

- **Purpose:** Team avatar and logo uploads in the profile Coach Card (Dashboard → Profile, for coaches).
- **Config:** Public, 5MB, images (PNG, JPEG, GIF, WebP, SVG).
- **Paths:** `teams/<team_id>/` for avatar, `teams/<team_id>/logo/` for logo.
- **RLS:** Public read; coaches can upload/update/delete only under `teams/<their profile.team_id>/`; admins have full access.

### Setup

- **Local (Supabase CLI):** Bucket is defined in `supabase/config.toml` under `[storage.buckets.team-assets]`. Run `supabase start` to apply.
- **Hosted:** Create the bucket in Dashboard (Storage → New bucket: `team-assets`, public, 5MB) or use **Settings → Storage → "Ensure required buckets"** (admin) to create it via the app.

If the profile image uploader reports that the bucket is not set up, an admin should run **Ensure required buckets** in the platform Storage tab or create `team-assets` in the Supabase Dashboard.
