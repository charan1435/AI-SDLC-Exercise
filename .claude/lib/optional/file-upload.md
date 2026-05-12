# Optional Skill: File Upload (Supabase Storage)

## Activate when
Spec mentions: upload, image, file, attachment, avatar, media, document

## Stack Addition
  No extra packages — Supabase JS SDK includes Storage

## Supabase Dashboard Setup
  Storage → New bucket
  Bucket name: [images / avatars / documents / files]
  Public: true for public assets, false for private files

## Upload Pattern (client component)
  ```typescript
  async function uploadFile(file: File, bucket: string, path: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return publicUrl
  }
  ```

## File Path Convention
  User files:   [userId]/[timestamp]-[filename]
  Public files: public/[category]/[filename]

## Storage RLS Policy
  ```sql
  -- Users can upload to their own folder
  CREATE POLICY "user upload own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

  -- Users can read their own files
  CREATE POLICY "user read own files"
  ON storage.objects FOR SELECT
  USING (auth.uid()::text = (storage.foldername(name))[1]);
  ```

## Rules
  ✅ Validate file type and size before upload
  ✅ Use user ID as path prefix for private files
  ✅ Always store the returned URL in the database
  ❌ Never allow upload without auth check
  ❌ Never serve private files without checking ownership
