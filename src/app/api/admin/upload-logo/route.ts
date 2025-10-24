import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/upload-logo
 *
 * Upload or update a business logo to Supabase Storage
 *
 * Required Headers:
 * - Authorization: Bearer <jwt_token>
 *
 * Request Body (FormData):
 * - file: File (image file)
 * - businessId: string
 * - permalink: string
 *
 * Response:
 * - success: boolean
 * - avatarUrl: string (public URL of uploaded image)
 * - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can upload business logos
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only super admins can upload business logos' },
        { status: 403 }
      )
    }

    // Get the authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Create Supabase client with the user's JWT token
    const supabase = createClient(token)

    // Parse the FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const businessId = formData.get('businessId') as string
    const permalink = formData.get('permalink') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!businessId || !permalink) {
      return NextResponse.json(
        { success: false, error: 'Business ID and permalink are required' },
        { status: 400 }
      )
    }

    // Validate file type (only images)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'

    // Create filename: <permalink>.<extension>
    const fileName = `${permalink}.${fileExtension}`

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    // If file exists, it will be replaced (upsert: true)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Replace existing file
        cacheControl: '3600' // Cache for 1 hour
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName)

    const avatarUrl = publicUrlData.publicUrl

    // Update business_clients table with new avatar_url
    const { error: updateError } = await supabase
      .from('business_clients')
      .update({
        avatar_url: avatarUrl,
        modified_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { success: false, error: `Failed to update database: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl
    })

  } catch (error) {
    console.error('Upload logo error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
