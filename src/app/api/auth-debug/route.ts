import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Debug endpoint for auth configuration validation
 * Access via: /api/auth-debug
 * 
 * This endpoint helps diagnose common auth issues by checking:
 * - Environment variables
 * - Supabase connectivity  
 * - Configuration status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const includeSecrets = searchParams.get('secrets') === 'true'

  console.log('=== AUTH DEBUG ENDPOINT ===')

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    
    // Environment validation
    environment_variables: {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: includeSecrets ? process.env.NEXT_PUBLIC_SUPABASE_URL : '***masked***',
        valid_format: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') && 
                     process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co')
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: includeSecrets ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '***masked***',
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      },
      NEXT_PUBLIC_SITE_URL: {
        present: !!process.env.NEXT_PUBLIC_SITE_URL,
        value: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
        default_fallback: !process.env.NEXT_PUBLIC_SITE_URL ? 'Will use localhost:3000' : null
      }
    },

    // URL configuration analysis
    url_analysis: {
      current_request_url: request.url,
      site_url: 'https://dominatelocalleadsai.sliplane.app',
      auth_confirm_url: 'https://dominatelocalleadsai.sliplane.app/auth/confirm',
      auth_reset_password_url: 'https://dominatelocalleadsai.sliplane.app/auth/reset-password',
      note: 'Using hardcoded production URL to prevent localhost issues in email redirects'
    },

    // Expected email template variables
    email_template_guidance: {
      recovery_template_note: 'Password reset emails now use the redirectTo URL from resetPasswordForEmail call',
      recovery_redirect_url: 'https://dominatelocalleadsai.sliplane.app/auth/reset-password',
      signup_template_should_contain: '{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}',
      notes: [
        'Password reset: redirectTo URL hardcoded in forgotPassword action to prevent localhost issues',
        'Signup confirmation: Make sure to use {{ .SiteURL }} instead of hardcoded URLs',
        'The type parameter must match the auth flow (recovery, email, etc.)',
        'For recovery emails, URL is controlled by resetPasswordForEmail redirectTo parameter'
      ]
    },

    // Common issues checklist
    troubleshooting_checklist: [
      {
        issue: 'Invalid confirmation link',
        possible_causes: [
          'Redirect URLs not configured in Supabase Dashboard',
          'Site URL mismatch between .env and Supabase Dashboard',
          'Email template using wrong variables',
          'Token expired (default 1 hour)',
          'Link already used (tokens are single-use)'
        ],
        solutions: [
          'Ensure https://dominatelocalleadsai.sliplane.app/auth/reset-password is in Supabase redirect URLs',
          'Verify Site URL in dashboard is set to https://dominatelocalleadsai.sliplane.app',
          'Check email template uses correct token_hash parameter',
          'Request a fresh password reset if token expired'
        ]
      },
      {
        issue: 'Redirect loop or wrong page',
        possible_causes: [
          'Next parameter not properly passed',
          'Type parameter incorrect',
          'Multiple auth flows conflicting'
        ],
        solutions: [
          'Password reset emails now redirect directly to /auth/reset-password',
          'Check that hardcoded production URL is being used in forgotPassword action',
          'Verify Supabase dashboard redirect URLs include production domain'
        ]
      }
    ]
  }

  // Test Supabase connectivity
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    debugInfo.supabase_connectivity = {
      client_creation: 'success',
      current_user: user ? {
        id: user.id,
        email: user.email,
        authenticated: true
      } : {
        authenticated: false,
        note: 'No current session (expected for debug endpoint)'
      }
    }
  } catch (error) {
    debugInfo.supabase_connectivity = {
      client_creation: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      note: 'Check environment variables and Supabase configuration'
    }
  }

  console.log('Debug info generated:', JSON.stringify(debugInfo, null, 2))

  // Return debug info as JSON with proper headers
  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}