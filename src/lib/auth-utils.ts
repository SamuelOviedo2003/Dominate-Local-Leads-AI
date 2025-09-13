// Temporary compatibility file for auth-utils references
// Re-exports from the new authentication system

export { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
export { validateBusinessAccess as validateBusinessAccessWithToken } from '@/lib/auth-helpers-simple'
export { updateUserBusinessContext as updateUserBusinessContextWithToken } from '@/lib/auth-helpers-simple'