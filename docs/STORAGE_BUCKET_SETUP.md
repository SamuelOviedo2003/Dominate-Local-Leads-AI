# Storage Bucket Setup for Business Logos

## Quick Setup Guide

You need to create the `company-logos` storage bucket in Supabase before uploading logos.

### Option 1: Using Supabase Dashboard (Recommended)

#### Step 1: Create the Bucket

1. Go to **Supabase Dashboard** → Your Project
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Configure:
   - **Name:** `company-logos`
   - **Public bucket:** ✅ **ON** (so logos can be displayed publicly)
   - **File size limit:** `5 MB`
   - **Allowed MIME types:**
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `image/webp`
5. Click **Create bucket**

#### Step 2: Set Up Policies

1. Click on the `company-logos` bucket
2. Go to **Policies** tab
3. Click **New policy**

**Create 4 policies:**

---

**Policy 1: Public Read Access**
- **Policy name:** `Public Access - Read`
- **Allowed operation:** `SELECT`
- **Target roles:** `public`
- **USING expression:**
```sql
bucket_id = 'company-logos'
```

---

**Policy 2: Super Admin Insert**
- **Policy name:** `Super Admin Upload - Insert`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **WITH CHECK expression:**
```sql
bucket_id = 'company-logos' AND
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 0
)
```

---

**Policy 3: Super Admin Update**
- **Policy name:** `Super Admin Upload - Update`
- **Allowed operation:** `UPDATE`
- **Target roles:** `authenticated`
- **USING expression:**
```sql
bucket_id = 'company-logos' AND
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 0
)
```
- **WITH CHECK expression:**
```sql
bucket_id = 'company-logos' AND
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 0
)
```

---

**Policy 4: Super Admin Delete**
- **Policy name:** `Super Admin Upload - Delete`
- **Allowed operation:** `DELETE`
- **Target roles:** `authenticated`
- **USING expression:**
```sql
bucket_id = 'company-logos' AND
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 0
)
```

---

### Option 2: Using SQL Editor (Faster)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New query**
3. Paste this SQL and click **Run**:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Public read access
CREATE POLICY "Public Access - Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Policy 2: Super Admin insert
CREATE POLICY "Super Admin Upload - Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);

-- Policy 3: Super Admin update
CREATE POLICY "Super Admin Upload - Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
)
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);

-- Policy 4: Super Admin delete
CREATE POLICY "Super Admin Upload - Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);
```

---

## Verify Setup

After creating the bucket and policies, verify everything is set up correctly:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'company-logos';

-- Check policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%company-logos%'
ORDER BY policyname;
```

**Expected Results:**
- Bucket exists with `public = true`
- 4 policies created (Public Read, Super Admin Insert/Update/Delete)

---

## Troubleshooting

### Error: "new row violates row-level security policy"

**Cause:** Bucket doesn't exist or policies are missing

**Solution:** Run the SQL script above in SQL Editor

---

### Error: "Bucket already exists"

**Cause:** Bucket exists but policies are missing

**Solution:** Skip the bucket creation, just create the policies:

```sql
-- Only create policies (skip bucket creation)
CREATE POLICY IF NOT EXISTS "Public Access - Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Repeat for other 3 policies...
```

---

### Error: "Policy already exists"

**Cause:** Policies already created

**Solution:** Drop and recreate:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Public Access - Read" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin Upload - Insert" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin Upload - Update" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin Upload - Delete" ON storage.objects;

-- Then recreate them with the SQL above
```

---

## Testing Upload

After setup, test the upload:

1. Log in as Super Admin (role = 0)
2. Go to **Admin → Business**
3. Click **Edit** on any business
4. Upload a logo
5. Should succeed ✅

---

## Security Notes

### Why These Policies Are Safe

1. **Public Read:** Logos need to be publicly accessible to display on website
2. **Super Admin Only Write:** Only role=0 users can upload/modify logos
3. **No Regular User Access:** Regular users (role ≥ 1) cannot upload
4. **File Validation:** API validates file type and size before upload
5. **Filename Format:** Uses `{permalink}.{ext}` for uniqueness

### What's Protected

- ✅ Only Super Admins can upload/change logos
- ✅ File type restricted to images only
- ✅ File size limited to 5MB
- ✅ Public can only read, not write
- ✅ Each business has unique filename (no collisions)

---

## Maintenance

### View All Uploaded Logos

```sql
SELECT
  name,
  bucket_id,
  created_at,
  updated_at,
  ROUND(metadata->>'size'::numeric / 1024, 2) as size_kb
FROM storage.objects
WHERE bucket_id = 'company-logos'
ORDER BY created_at DESC;
```

### Delete a Specific Logo

```sql
DELETE FROM storage.objects
WHERE bucket_id = 'company-logos'
  AND name = 'hard-roof.png';
```

### View Bucket Configuration

```sql
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'company-logos';
```

---

## Quick Reference

| Setting | Value |
|---------|-------|
| **Bucket ID** | `company-logos` |
| **Public Access** | Yes (read-only) |
| **File Size Limit** | 5 MB (5242880 bytes) |
| **Allowed Types** | JPEG, PNG, GIF, WebP |
| **Upload Access** | Super Admin only (role = 0) |
| **Filename Format** | `{permalink}.{extension}` |
| **Auto Replace** | Yes (upsert mode) |

---

## Next Steps

After setup is complete:

1. ✅ Create bucket and policies using SQL script above
2. ✅ Verify setup with verification queries
3. ✅ Test upload as Super Admin
4. ✅ Verify logo displays in business list
5. ✅ Test replacing existing logo (should work with upsert)

**Setup complete!** The logo upload feature is now ready to use.
