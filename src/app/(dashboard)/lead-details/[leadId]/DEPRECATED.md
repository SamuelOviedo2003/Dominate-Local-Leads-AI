# DEPRECATED: Dashboard Lead Details Route

## Status: DEPRECATED as of 2025-09-09

This route structure has been **deprecated** and replaced with the permalink-based routing system.

### Old Route (DEPRECATED)
```
/src/app/(dashboard)/lead-details/[leadId]/page.tsx
URL: /lead-details/{leadId}
```

### New Route (ACTIVE)  
```
/src/app/[permalink]/lead-details/[leadId]/page.tsx
URL: /{permalink}/lead-details/{leadId}
```

### Why This Was Deprecated

1. **Business Context Loss**: Old route did not maintain business context in URL
2. **Inconsistent Navigation**: Did not follow permalink-based routing pattern
3. **Multi-Business Issues**: Caused redirects to first business instead of current business
4. **URL Structure**: Not aligned with rest of application's permalink system

### Migration Path

The old route can be safely removed after verifying that:

1. ✅ All lead navigation uses the new permalink-based route
2. ✅ LeadsTable component uses permalink navigation hooks
3. ✅ E2E tests pass for lead navigation functionality
4. ✅ No hardcoded references to old route exist in codebase

### Safe Removal

To remove this deprecated route:

```bash
# Remove the entire dashboard lead-details directory
rm -rf src/app/\(dashboard\)/lead-details
```

**Note**: Only remove after confirming production deployment is stable with the new route structure.

### Related Changes

- LeadsTable component updated to use `usePermalinkNavigation`
- Permalink layout updated to include 'lead-details' in valid routes
- Comprehensive E2E tests added for lead navigation
- IMPLEMENTATION_NOTES.md updated with complete technical documentation

---
*This deprecation notice was created as part of the Lead Details Routing Fix implementation on 2025-09-09*