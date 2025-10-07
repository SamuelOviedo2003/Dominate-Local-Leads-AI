# Authentication & User Management

**Technical Documentation:** [../System/authentication.md](../System/authentication.md)

## User Need & Purpose

Roofing business owners and their teams need secure access to their lead management system. The authentication system ensures that only authorized users can access the platform, and each user sees only the business data they're permitted to view.

## Business Context

### Target Users
- **Super Admins (role: 0)**: Platform administrators who manage multiple businesses
- **Business Users (role: 1+)**: Business owners, sales teams, and appointment setters

### Business Value
- Secure multi-tenant architecture separates business data
- Role-based access control prevents unauthorized data access
- Seamless business switching for admins managing multiple clients
- Persistent sessions reduce login friction

## User Workflows

### Login Flow
1. User visits the platform
2. Enters email and password credentials
3. System validates credentials
4. User is redirected to their appropriate business dashboard
5. Session persists across browser restarts

### Signup Flow
1. New user clicks "Sign Up"
2. Enters full name, email, password, and password confirmation
3. Receives confirmation email
4. Clicks confirmation link
5. Account is activated and user can log in

### Business Switching (Super Admins)
1. Super admin clicks business switcher in header
2. Sees list of all businesses with dashboard enabled
3. Selects target business
4. URL updates to reflect new business
5. All data on screen refreshes for selected business

### Forgot Password
1. User clicks "Forgot Password" on login page
2. Enters email address
3. Receives password reset email
4. Clicks reset link and enters new password
5. Returns to login and accesses account

## Feature Requirements

### Access Control
- Super Admins can access ALL businesses in the platform
- Regular users can ONLY access businesses they're explicitly assigned to
- Business context persists across page navigation
- Invalid business access attempts redirect to user's first accessible business

### Session Management
- Sessions stored in secure HTTP-only cookies
- Automatic token refresh to maintain continuous access
- Graceful handling of session expiration
- Cross-device isolation prevents data mixing

### User Experience
- Single sign-on across all sections
- Minimal re-authentication during normal use
- Clear error messages for authentication failures
- Visual feedback during login/logout operations

### Security
- Password requirements enforced during signup
- Email confirmation required before account activation
- Secure cookie transmission (HTTPS in production)
- Business access validated on every request

## Edge Cases

### Failed Authentication
- Invalid credentials show clear error message
- User remains on login page to retry
- No sensitive information exposed in error messages

### Session Expiry
- Automatic logout when session expires
- Redirect to login page with context preserved
- User can log back in and resume work

### Missing Business Access
- Users without business assignments see helpful error
- Contact information provided for support
- System prevents unauthorized data access

### Business Switch Race Conditions
- Concurrent business switches are prevented
- UI shows loading state during switch
- Backend ensures atomic updates to business context

### Multi-Device Usage
- Each device maintains independent session
- No cross-device session contamination
- Logout on one device doesn't affect others
