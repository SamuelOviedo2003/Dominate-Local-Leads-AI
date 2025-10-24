# Business Logo Upload Feature

## Overview
This feature allows Super Admins to upload or change business logos through the Admin → Business management interface. Logos are stored in Supabase Storage and referenced in the `business_clients` table.

## Implementation Details

### Database
- **Table:** `business_clients`
- **Field:** `avatar_url` (string | null)
- **Storage:** Supabase Storage bucket named `company-logos`
- **Filename Format:** `<permalink>.<extension>` (e.g., `hard-roof.png`)

### Storage Configuration
**Bucket Name:** `company-logos`

**Required Bucket Policies:**
```sql
-- Allow authenticated users to read logos (public access)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow Super Admins (role = 0) to insert/update/delete logos
CREATE POLICY "Super Admin Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 0
  )
);

CREATE POLICY "Super Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 0
  )
);

CREATE POLICY "Super Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 0
  )
);
```

### API Endpoint

**URL:** `POST /api/admin/upload-logo`

**Authentication:** Bearer token (Super Admin only)

**Request:**
```typescript
// FormData
{
  file: File,           // Image file
  businessId: string,   // Business ID
  permalink: string     // Business permalink
}
```

**Response:**
```typescript
{
  success: boolean,
  avatarUrl: string,    // Public URL of uploaded image
  error?: string
}
```

**Validation:**
- File type: JPEG, JPG, PNG, GIF, WebP only
- File size: Maximum 5MB
- Authorization: Super Admin (role = 0) required

**Process:**
1. Validates user is Super Admin
2. Validates file type and size
3. Uploads to `company-logos` bucket with filename `<permalink>.<extension>`
4. Uses `upsert: true` to replace existing files
5. Updates `business_clients.avatar_url` with public URL
6. Updates `business_clients.modified_at` timestamp

### Frontend Implementation

**File:** `src/app/admin/business-management.tsx`

**New State Variables:**
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [imagePreview, setImagePreview] = useState<string | null>(null)
const [uploadingImage, setUploadingImage] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)
```

**Key Functions:**
- `handleFileSelect()` - Validates and previews selected file
- `handleUploadImage()` - Uploads file to API and updates database
- `handleSelectImageClick()` - Triggers file input dialog

**UI Components:**
1. **Image Preview Box** (96x96 pixels)
   - Shows current logo or placeholder icon
   - Shows preview when new file selected

2. **Select Image Button**
   - Opens file picker
   - Changes to "Change Image" when file selected

3. **Upload Button**
   - Only visible when file selected
   - Shows loading spinner during upload
   - Disabled during upload process

4. **Help Text**
   - Shows accepted formats and size limit
   - Shows selected filename and size
   - Shows preview of storage filename format

### User Flow

1. **Navigate to Business Edit:**
   - Admin → Business
   - Click Edit icon on any business row

2. **Upload Logo:**
   - Logo upload section appears at top of form
   - Click "Select Image" button
   - Choose image file (JPEG, PNG, GIF, WebP, max 5MB)
   - Preview appears immediately
   - Click "Upload" button
   - Spinner shows during upload
   - Success message appears
   - Logo updates in business list after 2 seconds

3. **Replace Existing Logo:**
   - Same process as above
   - New image replaces old one in storage
   - `avatar_url` updates to new public URL

### File Naming Convention

**Format:** `<permalink>.<extension>`

**Examples:**
- `hard-roof.png`
- `jenn-roofing.jpg`
- `abc-hvac.webp`

**Benefits:**
- Unique per business (permalink is unique)
- SEO-friendly
- Easy to identify in storage
- Automatic replacement (upsert)

### Error Handling

**Frontend Validation:**
- File type validation (before upload)
- File size validation (max 5MB)
- Clear error messages

**Backend Validation:**
- Authentication check (Bearer token)
- Authorization check (Super Admin role)
- File type validation (MIME type)
- File size validation (5MB limit)
- Permalink validation (must exist)

**Error Messages:**
- "Authorization token not found"
- "Unauthorized" (not logged in)
- "Super Admin access required" (wrong role)
- "No file provided"
- "Business ID and permalink are required"
- "Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)"
- "File size exceeds 5MB limit"
- "Failed to upload file: [details]"
- "Failed to update database: [details]"

### Security Features

1. **Authentication Required:**
   - JWT token must be present
   - Token validated against Supabase Auth

2. **Authorization Check:**
   - Only Super Admins (role = 0) can upload
   - Checked on both frontend and backend

3. **File Validation:**
   - MIME type checked
   - File size limited to 5MB
   - Only image formats accepted

4. **Storage Security:**
   - Bucket policies enforce role-based access
   - Public read (for logo display)
   - Admin-only write/update/delete

5. **Database Security:**
   - RLS policies on `business_clients` table
   - Only authorized updates allowed

### Testing Checklist

**Before First Use:**
- [ ] Create `company-logos` bucket in Supabase Storage
- [ ] Apply storage policies (see above)
- [ ] Verify bucket is publicly readable
- [ ] Test Super Admin authentication

**Functional Tests:**
- [ ] Upload new logo (JPEG, PNG, GIF, WebP)
- [ ] Replace existing logo
- [ ] Verify filename format matches `<permalink>.<ext>`
- [ ] Verify `avatar_url` updates in database
- [ ] Verify logo displays in business list
- [ ] Test file type validation (reject non-images)
- [ ] Test file size validation (reject > 5MB)
- [ ] Test unauthorized access (non-admin users)

**UI Tests:**
- [ ] Image preview shows immediately after selection
- [ ] Upload button only appears when file selected
- [ ] Loading spinner appears during upload
- [ ] Success message appears after upload
- [ ] Error messages display clearly
- [ ] Logo updates in list view after upload

### Performance Considerations

- **Cache Control:** Images cached for 1 hour (`cacheControl: '3600'`)
- **File Size Limit:** 5MB prevents large uploads
- **Upsert Mode:** Automatically replaces old files (no orphan files)
- **Async Upload:** Non-blocking UI during upload

### Maintenance

**Bucket Cleanup:**
Logos are replaced automatically when re-uploaded (upsert mode). No manual cleanup needed unless:
- Business is deleted (orphan logo remains)
- Permalink is changed (old logo remains)

**Monitor:**
- Storage bucket size
- Failed upload logs
- Orphaned files (logos without corresponding business)

### Future Enhancements

**Potential Improvements:**
1. Image cropping/resizing tool
2. Drag-and-drop upload
3. Bulk logo upload
4. Automatic image optimization
5. CDN integration for faster delivery
6. Logo history/versioning
7. Automatic cleanup of orphaned files

## Files Modified

### New Files:
- `src/app/api/admin/upload-logo/route.ts` - Upload API endpoint

### Modified Files:
- `src/app/admin/business-management.tsx` - Added upload UI and logic

### No Changes Required:
- `src/app/api/admin/businesses/route.ts` - Existing update endpoint works
- Database schema - `avatar_url` field already exists

## Dependencies

- **Supabase Client:** `@/lib/supabase/server`
- **React Hooks:** `useState`, `useRef`
- **Lucide Icons:** `Upload`, `Image`
- **Next.js:** FormData, NextRequest, NextResponse

## Support

For issues or questions:
1. Check Supabase Storage bucket exists
2. Verify bucket policies are applied
3. Check user has Super Admin role (role = 0)
4. Review browser console for errors
5. Check API endpoint logs for details
