# Session Debugging System Guide

## Overview

This comprehensive debugging system is designed to help identify and resolve user data mixing issues in your Next.js application. The system provides structured, secure, and user-specific debug logs that track authentication, business context, cache operations, and API requests across frontend and backend components.

## ✨ Key Features

- **Session Isolation**: Each browser tab gets a unique session identifier
- **User-Specific Tracking**: Logs are tagged with user IDs and business context
- **Security First**: Sensitive data (JWT tokens, passwords) is automatically masked
- **Production Safe**: Conditional logging that can be enabled/disabled dynamically
- **Performance Monitoring**: Cache hit rates, API response times, operation duration
- **Correlation**: Request IDs help trace operations across frontend and backend

## 🚀 Quick Start

### Enable Debug Logging

**In Development:**
Debug logging is automatically enabled in development mode.

**In Production/Browser:**
```javascript
// In browser console
__enableSessionDebug()  // Enable
__disableSessionDebug() // Disable  
__debugStatus()         // Check status
```

**Via URL Parameter:**
```
https://your-app.com?debug=true
```

**Via Environment Variable:**
```bash
DEBUG_SESSION_TRACKING=true
```

## 📋 Log Format

Each debug log follows this structured format:

```
[LEVEL][CONTEXT][TAB_ID][U:USER_ID][B:BUSINESS_ID][JWT:TOKEN_HASH][REQUEST_ID] Message
```

Example:
```
[DEBUG][AUTH][tab_1234567890_abc123def][U:a1b2c3d4][B:567][JWT:eyJhbGci][req_1234567890_xyz789] User authentication successful
```

## 🔍 Debug Contexts

### AUTH - Authentication Operations
- User login/logout
- JWT token validation
- Session management
- Authentication failures

### BUSINESS - Business Context Operations
- Business switching
- Business access validation
- Context synchronization
- Role-based operations

### CACHE - Cache Operations
- Cache hits/misses with timing
- Cache invalidation
- Performance metrics
- Stale cache serving

### API - API Route Operations
- Request/response logging
- Parameter validation
- Error handling
- Performance timing

### SESSION - Session Management
- Session creation/destruction
- Context refresh
- Cross-tab coordination
- Session isolation

### UI - User Interface Operations
- Component state changes
- User interactions
- Context updates
- Error boundaries

## 💡 Usage Examples

### Frontend (React Components)

```typescript
import { debugUI, debugSession, extractUserMetadata } from '@/lib/debug'

function MyComponent() {
  const { user, currentBusiness } = useBusinessContext()
  
  const handleClick = () => {
    const metadata = extractUserMetadata(user, currentBusiness)
    debugUI('Button clicked', { 
      component: 'MyComponent',
      action: 'submit' 
    }, metadata)
  }
  
  useEffect(() => {
    debugSession('Component mounted', {
      component: 'MyComponent',
      hasUser: !!user,
      hasBusiness: !!currentBusiness
    }, extractUserMetadata(user, currentBusiness))
  }, [])
}
```

### Backend (API Routes)

```typescript
import { withAuthenticatedApiDebug } from '@/lib/api-debug-middleware'
import { debugBusiness } from '@/lib/debug'

export const POST = withAuthenticatedApiDebug(
  async (request, context, user) => {
    debugBusiness('Processing business operation', {
      operation: 'data-fetch',
      requestId: context.requestId
    }, { userId: user.id, businessId: user.businessId })
    
    // Your business logic here
    
    return NextResponse.json({ success: true })
  },
  getAuthenticatedUserFromRequest
)
```

### Cache Operations

```typescript
import { debugCacheOperation } from '@/lib/debug'

// Cache hit
debugCacheOperation('hit', 'user:123:businesses', 
  { age: '5000ms' }, 
  { userId: '123' }
)

// Cache miss
debugCacheOperation('miss', 'user:123:businesses', 
  { reason: 'expired' }, 
  { userId: '123' }
)
```

## 🔒 Security Features

### Automatic Data Masking

**JWT Tokens:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... → eyJhbGci...IkpXVCJ9
```

**Email Addresses:**
```
user@example.com → us***@example.com
```

**Sensitive Fields:**
Any field containing 'password', 'token', 'secret', 'key', 'auth', or 'jwt' is automatically masked as `[MASKED]`.

### Production Safety

- Debug logs only appear when explicitly enabled
- No performance impact in production when disabled
- Structured data prevents code injection
- Automatic cleanup of expired debug data

## 📊 Common Debugging Scenarios

### 1. User Data Mixing Investigation

**What to look for:**
- Multiple user IDs appearing in the same tab session
- Business context mismatches between frontend and backend
- Cache entries serving wrong user data

**Example log pattern:**
```
[DEBUG][SESSION][tab_abc123][U:user1][B:biz1] Context refresh started
[DEBUG][AUTH][tab_abc123][U:user2][B:biz1] Cache hit - wrong user!
[ERROR][SESSION][tab_abc123][U:user1][B:biz1] Data mismatch detected
```

### 2. Authentication Flow Debugging

**What to look for:**
- JWT token correlation across requests
- Authentication failures and retries
- Session creation/destruction patterns

**Example log pattern:**
```
[DEBUG][AUTH][tab_abc123][][JWT:eyJhbGci] Authentication attempt
[DEBUG][AUTH][tab_abc123][U:user1][JWT:eyJhbGci] Authentication successful
[DEBUG][CACHE][tab_abc123][U:user1] User data cached
```

### 3. Business Switching Issues

**What to look for:**
- Business context updates across components
- Access validation for business switches
- URL vs context synchronization

**Example log pattern:**
```
[DEBUG][BUSINESS][tab_abc123][U:user1][B:biz1] Business switch attempt
[DEBUG][API][tab_abc123][U:user1][B:biz1] POST /api/user/switch-business
[DEBUG][BUSINESS][tab_abc123][U:user1][B:biz2] Business switch successful
[DEBUG][UI][tab_abc123][U:user1][B:biz2] Context updated in components
```

### 4. Cache Performance Issues

**What to look for:**
- Cache hit/miss ratios
- Stale cache serving patterns
- Cache invalidation timing

**Example log pattern:**
```
[DEBUG][CACHE][tab_abc123][U:user1][B:biz1] Cache MISS: user:1:businesses
[DEBUG][CACHE][tab_abc123][U:user1][B:biz1] Cache SET: user:1:businesses
[DEBUG][CACHE][tab_abc123][U:user1][B:biz1] Cache HIT: user:1:businesses (age: 5000ms)
```

## 🛠️ Advanced Features

### Custom Debug Contexts

```typescript
import { debugLogger, DebugLevel, DebugContext } from '@/lib/debug'

// Custom context for specific debugging
debugLogger.log(
  DebugLevel.INFO,
  DebugContext.API,
  'Custom operation completed',
  { customData: 'value' },
  { userId: '123', businessId: '456' }
)
```

### Conditional Debugging

```typescript
import { debugLogger } from '@/lib/debug'

// Only log in specific conditions
if (debugLogger.getStatus().enabled) {
  // Expensive debug operation
  const complexData = computeExpensiveDebugInfo()
  debugAPI('Complex operation result', complexData)
}
```

### Performance Monitoring

```typescript
const startTime = performance.now()
// Your operation
const duration = performance.now() - startTime

debugAPI('Operation completed', {
  operation: 'data-processing',
  duration: `${duration}ms`,
  performance: duration < 100 ? 'good' : 'slow'
})
```

## 📈 Monitoring and Analysis

### Key Metrics to Track

1. **Session Isolation**: Each tab should maintain consistent user/business context
2. **Authentication Flow**: JWT tokens should correlate across requests  
3. **Cache Performance**: Hit rates above 80% indicate good performance
4. **Business Context**: Business switches should be atomic and consistent
5. **Error Patterns**: Look for recurring error patterns across users

### Log Analysis Tips

1. **Filter by Tab ID**: Track a single user session
2. **Filter by User ID**: See all operations for a specific user
3. **Filter by Request ID**: Trace a specific API request end-to-end
4. **Filter by Context**: Focus on specific operation types
5. **Look for Timing**: Identify performance bottlenecks

## 🚨 Troubleshooting

### Debug Logs Not Appearing

1. Check if debugging is enabled: `__debugStatus()`
2. Verify environment: Development mode enables by default
3. Check browser console for errors in debug system
4. Ensure imports are correct in your components

### Performance Impact

1. Debug logging has minimal impact when disabled
2. Expensive operations are avoided when debugging is off
3. Use conditional logging for complex debug operations
4. Monitor console performance in browser dev tools

### Security Concerns

1. Sensitive data is automatically masked
2. Debug logs don't persist beyond browser session
3. Production deployment should disable by default
4. Review log contents before sharing externally

## 🎯 Best Practices

1. **Use appropriate contexts**: AUTH for auth, BUSINESS for business ops, etc.
2. **Include request IDs**: For tracing operations across components
3. **Extract user metadata**: Consistent context across all logs
4. **Log state changes**: Before and after important operations
5. **Use structured data**: Objects instead of string concatenation
6. **Monitor performance**: Include timing data for slow operations
7. **Handle errors gracefully**: Always log error context and recovery attempts

This debugging system provides comprehensive visibility into your application's authentication and business context flow, making it much easier to identify and resolve user data mixing issues.