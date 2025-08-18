import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // Validate that the URL is from allowed domains (security measure)
    const allowedDomains = [
      'maps.googleapis.com',
      'maps.google.com'
    ]
    
    let parsedUrl: URL
    try {
      parsedUrl = new URL(imageUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }
    
    const isAllowedDomain = allowedDomains.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    )
    
    if (!isAllowedDomain) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      )
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Dominate-Local-Leads-AI/1.0',
        'Accept': 'image/*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
    
    if (!response.ok) {
      console.error(`[IMAGE-PROXY] Failed to fetch image: ${imageUrl}`, {
        status: response.status,
        statusText: response.statusText,
      })
      
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const contentType = response.headers.get('Content-Type')
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Response is not an image' },
        { status: 400 }
      )
    }
    
    const imageBuffer = await response.arrayBuffer()
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
    
  } catch (error) {
    console.error('[IMAGE-PROXY] Error proxying image:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}