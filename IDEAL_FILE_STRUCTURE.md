# Ideal File Structure for Next.js Lead Management System

## Overview
This document outlines the recommended file structure for optimal modularity, readability, and maintainability, with preparation for TanStack Query migration.

## Complete Directory Structure

```
src/
├── app/                                    # Next.js App Router
│   ├── (auth)/                            # Auth route group
│   │   ├── layout.tsx                     # Auth-specific layout
│   │   ├── page.tsx                       # Login page (root auth)
│   │   ├── confirm-email/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/                       # Protected routes group
│   │   ├── layout.tsx                     # Dashboard layout with header
│   │   ├── home/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── new-leads/
│   │   │   └── page.tsx
│   │   ├── leads/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── salesman/
│   │   │   └── page.tsx
│   │   ├── incoming-calls/
│   │   │   └── page.tsx
│   │   ├── fb-analysis/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── profile/
│   │           └── page.tsx
│   │
│   ├── api/                               # API routes
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   ├── signout/
│   │   │   └── refresh/
│   │   ├── leads/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── calls/
│   │   │   └── route.ts
│   │   └── users/
│   │       ├── route.ts
│   │       └── delete/
│   │           └── route.ts
│   │
│   ├── globals.css
│   └── layout.tsx                         # Root layout
│
├── features/                              # 🔄 Feature-based organization (Co-location)
│   ├── auth/                             # Authentication feature
│   │   ├── components/
│   │   │   ├── AuthForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   ├── ResetPasswordForm.tsx
│   │   │   ├── ConfirmEmailForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts               # Combines auth state & actions
│   │   │   └── useAuthRedirect.ts
│   │   ├── utils/
│   │   │   └── auth-helpers.ts          # Auth-specific utilities
│   │   ├── types/
│   │   │   └── auth.types.ts            # Auth-specific types
│   │   ├── validations/
│   │   │   └── auth-schemas.ts          # Auth validation schemas
│   │   ├── __tests__/                   # Co-located tests
│   │   │   ├── components/
│   │   │   │   ├── AuthForm.test.tsx
│   │   │   │   ├── ForgotPasswordForm.test.tsx
│   │   │   │   └── ResetPasswordForm.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.test.ts
│   │   │   │   └── useAuthRedirect.test.ts
│   │   │   ├── utils/
│   │   │   │   └── auth-helpers.test.ts
│   │   │   └── __mocks__/
│   │   │       └── auth-mocks.ts        # Feature-specific test mocks
│   │   └── index.ts                     # Public API exports
│   │
│   ├── leads/                            # Lead management feature
│   │   ├── components/
│   │   │   ├── LeadsTable.tsx
│   │   │   ├── LeadForm.tsx
│   │   │   ├── LeadDetailsCard.tsx
│   │   │   ├── LeadMetrics.tsx
│   │   │   ├── AppointmentSetters.tsx
│   │   │   ├── LeadStatusBadge.tsx
│   │   │   ├── LeadScoreCircle.tsx
│   │   │   └── LeadFilters.tsx          # Lead-specific filters
│   │   ├── hooks/
│   │   │   ├── useLeadsData.ts          # Main leads data hook
│   │   │   ├── useLeadDetails.ts        # Individual lead details
│   │   │   ├── useLeadMetrics.ts        # Lead metrics calculation
│   │   │   ├── useAppointmentSetters.ts
│   │   │   └── useLeadForm.ts           # Form state management
│   │   ├── utils/
│   │   │   ├── lead-helpers.ts          # Lead-specific utilities
│   │   │   ├── lead-calculations.ts     # Score calculations, etc.
│   │   │   └── lead-formatters.ts       # Lead data formatting
│   │   ├── types/
│   │   │   └── lead.types.ts            # Lead-specific types
│   │   ├── validations/
│   │   │   └── lead-schemas.ts          # Lead validation schemas
│   │   ├── __tests__/                   # Co-located tests
│   │   │   ├── components/
│   │   │   │   ├── LeadsTable.test.tsx
│   │   │   │   ├── LeadForm.test.tsx
│   │   │   │   ├── LeadDetailsCard.test.tsx
│   │   │   │   ├── LeadMetrics.test.tsx
│   │   │   │   └── AppointmentSetters.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLeadsData.test.ts
│   │   │   │   ├── useLeadDetails.test.ts
│   │   │   │   └── useLeadMetrics.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── lead-helpers.test.ts
│   │   │   │   ├── lead-calculations.test.ts
│   │   │   │   └── lead-formatters.test.ts
│   │   │   └── __mocks__/
│   │   │       ├── lead-mocks.ts        # Lead test data
│   │   │       └── supabase-mocks.ts    # Supabase mocks for leads
│   │   └── index.ts                     # Public API exports
│   │
│   ├── calls/                            # Call management feature
│   │   ├── components/
│   │   │   ├── RecentIncomingCallsTable.tsx
│   │   │   ├── CommunicationsTable.tsx
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── CallStatusBadge.tsx
│   │   │   └── CallFilters.tsx          # Call-specific filters
│   │   ├── hooks/
│   │   │   ├── useCallsData.ts          # Main calls data hook
│   │   │   ├── useCommunications.ts     # Communications management
│   │   │   ├── useIncomingCalls.ts      # Incoming calls analytics
│   │   │   └── useAudioPlayer.ts        # Audio player state
│   │   ├── utils/
│   │   │   ├── call-helpers.ts          # Call-specific utilities
│   │   │   ├── audio-utils.ts           # Audio processing utilities
│   │   │   └── call-formatters.ts       # Call data formatting
│   │   ├── types/
│   │   │   └── call.types.ts            # Call-specific types
│   │   ├── __tests__/                   # Co-located tests
│   │   │   ├── components/
│   │   │   │   ├── RecentIncomingCallsTable.test.tsx
│   │   │   │   ├── CommunicationsTable.test.tsx
│   │   │   │   ├── AudioPlayer.test.tsx
│   │   │   │   └── CallStatusBadge.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCallsData.test.ts
│   │   │   │   ├── useCommunications.test.ts
│   │   │   │   └── useAudioPlayer.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── call-helpers.test.ts
│   │   │   │   ├── audio-utils.test.ts
│   │   │   │   └── call-formatters.test.ts
│   │   │   └── __mocks__/
│   │   │       ├── call-mocks.ts        # Call test data
│   │   │       └── audio-mocks.ts       # Audio player mocks
│   │   └── index.ts                     # Public API exports
│   │
│   ├── analytics/                        # Analytics & charts feature
│   │   ├── components/
│   │   │   ├── SourceDistributionChart.tsx
│   │   │   ├── CallerTypeDistributionChart.tsx
│   │   │   ├── SourceToCallerTypeSankey.tsx
│   │   │   ├── RevenueMetrics.tsx
│   │   │   ├── ChartContainer.tsx       # Reusable chart wrapper
│   │   │   └── ChartLegend.tsx
│   │   ├── hooks/
│   │   │   ├── useChartData.ts          # Chart data processing
│   │   │   ├── useAnalyticsData.ts      # Analytics data fetching
│   │   │   └── useRevenueMetrics.ts     # Revenue calculations
│   │   ├── utils/
│   │   │   ├── chart-helpers.ts         # Chart processing utilities
│   │   │   ├── analytics-calculations.ts
│   │   │   └── data-transformers.ts     # Data transformation for charts
│   │   ├── types/
│   │   │   └── analytics.types.ts       # Analytics-specific types
│   │   ├── __tests__/                   # Co-located tests
│   │   │   ├── components/
│   │   │   │   ├── SourceDistributionChart.test.tsx
│   │   │   │   ├── CallerTypeDistributionChart.test.tsx
│   │   │   │   ├── SourceToCallerTypeSankey.test.tsx
│   │   │   │   └── RevenueMetrics.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChartData.test.ts
│   │   │   │   ├── useAnalyticsData.test.ts
│   │   │   │   └── useRevenueMetrics.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── chart-helpers.test.ts
│   │   │   │   ├── analytics-calculations.test.ts
│   │   │   │   └── data-transformers.test.ts
│   │   │   └── __mocks__/
│   │   │       ├── analytics-mocks.ts   # Analytics test data
│   │   │       └── chart-mocks.ts       # Chart data mocks
│   │   └── index.ts                     # Public API exports
│   │
│   ├── users/                            # User management feature
│   │   ├── components/
│   │   │   ├── EditProfileForm.tsx
│   │   │   ├── DeleteProfileForm.tsx
│   │   │   ├── AvatarUpload.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── hooks/
│   │   │   ├── useUserProfile.ts        # User profile management
│   │   │   ├── useUserSettings.ts       # User settings management
│   │   │   └── useFileUpload.ts         # Avatar/file upload
│   │   ├── utils/
│   │   │   └── user-helpers.ts          # User-specific utilities
│   │   ├── types/
│   │   │   └── user.types.ts            # User-specific types
│   │   ├── validations/
│   │   │   └── user-schemas.ts          # User validation schemas
│   │   ├── __tests__/                   # Co-located tests
│   │   │   ├── components/
│   │   │   │   ├── EditProfileForm.test.tsx
│   │   │   │   ├── DeleteProfileForm.test.tsx
│   │   │   │   └── AvatarUpload.test.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUserProfile.test.ts
│   │   │   │   ├── useUserSettings.test.ts
│   │   │   │   └── useFileUpload.test.ts
│   │   │   ├── utils/
│   │   │   │   └── user-helpers.test.ts
│   │   │   └── __mocks__/
│   │   │       ├── user-mocks.ts        # User test data
│   │   │       └── file-upload-mocks.ts # File upload mocks
│   │   └── index.ts                     # Public API exports
│   │
│   └── business/                         # Business management feature
│       ├── components/
│       │   ├── BusinessSwitcher.tsx
│       │   └── BusinessConfig.tsx
│       ├── hooks/
│       │   ├── useBusinessData.ts       # Business data management
│       │   └── useBusinessConfig.ts     # Business configuration
│       ├── utils/
│       │   └── business-helpers.ts      # Business-specific utilities
│       ├── types/
│       │   └── business.types.ts        # Business-specific types
│       ├── __tests__/                   # Co-located tests
│       │   ├── components/
│       │   │   ├── BusinessSwitcher.test.tsx
│       │   │   └── BusinessConfig.test.tsx
│       │   ├── hooks/
│       │   │   ├── useBusinessData.test.ts
│       │   │   └── useBusinessConfig.test.ts
│       │   ├── utils/
│       │   │   └── business-helpers.test.ts
│       │   └── __mocks__/
│       │       └── business-mocks.ts    # Business test data
│       └── index.ts                     # Public API exports
│
├── components/                            # 🔄 Only TRULY shared components
│   ├── ui/                               # Base UI components (shadcn/ui)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Label.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   └── Toast.tsx
│   │
│   ├── layout/                           # Shared layout components
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── ProtectedLayout.tsx
│   │   └── ChatInterface.tsx
│   │
│   └── shared/                           # Generic shared components
│       ├── ErrorBoundary.tsx
│       ├── ErrorFallback.tsx
│       ├── LoadingScreen.tsx             # Generic loading components
│       ├── LoadingOverlay.tsx
│       ├── InlineLoader.tsx
│       ├── HouseIllustration.tsx
│       ├── DataTable.tsx                # Generic data table
│       ├── EmptyState.tsx
│       ├── ConfirmDialog.tsx
│       ├── PageContainer.tsx
│       └── SectionHeader.tsx
│
├── hooks/                                 # 🔄 Only GLOBAL/GENERIC hooks
│   ├── useDebounce.ts                    # Generic debouncing
│   ├── useLocalStorage.ts                # Generic local storage
│   ├── useMediaQuery.ts                  # Generic media queries
│   ├── useScrollPosition.ts              # Generic scroll handling
│   └── useTablePagination.ts             # Generic table pagination
│
├── lib/                                  # ✅ General-purpose utilities & config
│   ├── supabase/                        # Supabase configuration
│   │   ├── index.ts                     # Main client export
│   │   ├── client.ts                    # Base client config
│   │   ├── server-client.ts             # Server-side client
│   │   ├── middleware-client.ts         # Middleware client
│   │   └── database.types.ts            # Generated Supabase types
│   │
│   ├── utils/                           # Generic utility functions
│   │   ├── index.ts                     # Barrel export
│   │   ├── date-utils.ts                # Generic date/time utilities
│   │   ├── format-utils.ts              # Generic formatting utilities
│   │   ├── validation-utils.ts          # Generic validation helpers
│   │   ├── color-utils.ts               # Generic color/theming utilities
│   │   ├── api-utils.ts                 # Generic API helpers
│   │   └── general-utils.ts             # General utilities (cn, etc.)
│   │
│   ├── constants/                       # Application-wide constants
│   │   ├── index.ts                     # Barrel export
│   │   ├── routes.ts                    # Route constants
│   │   ├── api-endpoints.ts             # API endpoints
│   │   ├── app-config.ts                # App configuration
│   │   ├── colors.ts                    # Color constants
│   │   ├── permissions.ts               # Permission constants
│   │   └── time-zones.ts                # Timezone data
│   │
│   └── performance/                     # Performance utilities
│       ├── index.ts                     # Barrel export
│       ├── monitoring.ts                # Performance monitoring
│       ├── optimization.ts              # Optimization utilities
│       └── analytics.ts                 # Analytics helpers
│
├── contexts/                             # React contexts for global state
│   ├── index.ts                         # Barrel export
│   ├── AuthContext.tsx                  # Global auth context (from features/auth)
│   ├── ThemeContext.tsx                 # Global theme context
│   ├── FiltersContext.tsx               # Global filters context
│   └── NotificationContext.tsx          # Global notifications context
│
├── types/                               # 🔄 Only GLOBAL types
│   ├── index.ts                        # Main types export
│   ├── database.types.ts               # Supabase generated types
│   ├── api.ts                         # Global API types
│   ├── ui.ts                          # Global UI component types
│   └── global.ts                      # Global type definitions
│
└── middleware.ts                        # Next.js middleware
```

## Key Benefits of This Structure

### 1. **Feature-Based Organization & Co-location**
- **Related code grouped together**: Components, hooks, utils, types, and validations for each feature are in one place
- **Easier navigation**: No more searching across multiple directories for related functionality
- **Clear ownership**: Each feature directory has clear boundaries for team collaboration
- **Reduced cognitive load**: Developers working on leads don't need to think about auth or analytics

### 2. **Eliminated Duplication**
- **No more `hooks/data/` vs `queries/` confusion**: Keep only feature-specific hooks until TanStack Query migration
- **Consolidated utilities**: Feature-specific utils stay with features, only generic ones in `lib/utils/`
- **Type co-location**: Feature-specific types stay with features, only global types in root `types/`

### 3. **Improved Maintainability**
- **Single source of truth**: Each feature exports its public API through `index.ts`
- **Easier refactoring**: Changes to leads functionality only require touching the `features/leads/` directory
- **Better testing**: Test files can be co-located within each feature directory
- **Reduced import complexity**: Clear public APIs prevent internal implementation coupling

### 4. **Simplified Shared Components**
- **Only truly reusable components**: `components/` now contains only genuinely shared UI and layout components
- **No scattered filters**: Feature-specific filters stay with their features (LeadFilters, CallFilters)
- **Clear boundaries**: If it's used by multiple features, it stays in `components/`; if feature-specific, it moves to the feature

### 5. **TanStack Query Migration Ready**
- **Easy transition path**: When migrating, each feature's hooks can be replaced with TanStack queries independently
- **No structural changes needed**: Feature structure remains the same, only the data fetching implementation changes
- **Gradual migration**: Can migrate one feature at a time without affecting others

### 6. **Co-located Testing Strategy**
- **Tests stay with code**: Each feature has its own `__tests__/` directory mirroring the feature structure
- **Feature-specific mocks**: `__mocks__/` directories contain test data and mocks relevant to each feature
- **Easier test maintenance**: When refactoring a feature, all related tests are in the same directory
- **Isolated test coverage**: Can run tests for individual features independently
- **Better test organization**: Tests are organized by components, hooks, and utils just like the source code

## Maintainability Issues Addressed

### 🔧 Issue #1: Duplication Between hooks/data/ and queries/
**Problem**: Confusion about where to place data-fetching logic
**Solution**: 
- **Remove `queries/` directory** until TanStack Query migration
- **Keep only feature-specific data hooks** in each feature directory
- **Clear migration path**: When ready for TanStack Query, each feature can be migrated independently

### 🔧 Issue #2: Overly Granular Component Structure  
**Problem**: Components scattered across too many directories
**Solution**:
- **Feature-based grouping**: `features/leads/components/` instead of separate `components/leads/`, `components/filters/`, `components/charts/`
- **Co-location**: Related components, hooks, and utilities grouped together
- **Clear boundaries**: Only truly shared components remain in root `components/`

### 🔧 Issue #3: Lack of Co-location
**Problem**: Related functionality scattered across the project
**Solution**:
- **Everything for a feature in one place**: Components, hooks, utils, types, validations
- **Public APIs**: Each feature exports its public interface through `index.ts`
- **Reduced coupling**: Features can be developed and tested independently

## Migration Benefits

### Immediate Improvements:
1. **Faster Development**: Find all related code in one feature directory
2. **Easier Debugging**: All relevant code for a feature is co-located
3. **Better Code Reviews**: Changes are contained within feature boundaries
4. **Improved Testing**: Test files can be co-located with the code they test
5. **Reduced Cognitive Load**: Work on one feature without thinking about others

### Team Collaboration Benefits:
1. **Clear Ownership**: Each team member can own specific features
2. **Reduced Merge Conflicts**: Changes are isolated to feature directories
3. **Faster Onboarding**: New developers can understand one feature at a time
4. **Independent Development**: Teams can work on different features without coordination

### Future-Proofing:
1. **TanStack Query Migration**: Each feature can be migrated independently
2. **Micro-frontends**: Structure supports splitting into separate applications
3. **Performance Optimizations**: Features can be lazy-loaded independently
4. **Scaling**: Adding new features doesn't impact existing ones

## Implementation Strategy

### Phase 1: Create Feature Structure
```bash
# Create new feature directories
mkdir -p src/features/{auth,leads,calls,analytics,users,business}
mkdir -p src/features/{auth,leads,calls,analytics,users,business}/{components,hooks,utils,types,validations,__tests__}
mkdir -p src/features/{auth,leads,calls,analytics,users,business}/__tests__/{components,hooks,utils,__mocks__}
```

### Phase 2: Move Components (Feature by Feature)
```bash
# Example for leads feature
mv src/components/LeadMetrics.tsx src/features/leads/components/
mv src/components/LeadsTable.tsx src/features/leads/components/
mv src/components/AppointmentSetters.tsx src/features/leads/components/
```

### Phase 3: Move & Split Hooks
```bash
# Move feature-specific hooks
mv src/hooks/useMetrics.ts src/features/leads/hooks/useLeadMetrics.ts
mv src/hooks/useCommunications.ts src/features/calls/hooks/
```

### Phase 4: Move & Split Utilities
```bash
# Move feature-specific utilities
mv src/lib/leadUtils.ts src/features/leads/utils/lead-helpers.ts
# Split generic utilities remain in lib/utils/
```

### Phase 5: Create Public APIs
```typescript
// src/features/leads/index.ts
export { LeadsTable } from './components/LeadsTable'
export { LeadMetrics } from './components/LeadMetrics'
export { useLeadsData } from './hooks/useLeadsData'
export type { Lead, LeadStatus } from './types/lead.types'
```

### Phase 6: Update Imports
```typescript
// Before
import { LeadsTable } from '@/components/leads/LeadsTable'
import { useMetrics } from '@/hooks/useMetrics'

// After  
import { LeadsTable, useLeadsData } from '@/features/leads'
```

This phased approach ensures the migration can be done incrementally without breaking existing functionality.