# .agent - Project Documentation Hub

This folder contains organized, comprehensive documentation for the Lead Management System, structured to provide clear separation between product requirements, technical implementation, and problem resolution procedures.

## Folder Structure

```
.agent/
├── README.md           (This file)
├── Tasks/              (Product & PRD perspective)
├── System/             (Technical implementation)
└── SOP/                (Standard Operating Procedures - Problem resolution)
```

## Documentation Philosophy

### Tasks/ - Product Documentation (What & Why)
**Purpose:** Describes features from a product and user perspective
**Focus:** User needs, business value, workflows, requirements
**Audience:** Product managers, stakeholders, designers, business analysts

Each file answers:
- What problem does this feature solve?
- Who is the target user?
- What are the user workflows?
- What are the business requirements?
- What edge cases exist?

### System/ - Technical Documentation (How)
**Purpose:** Describes technical implementation details
**Focus:** Architecture, code structure, APIs, database schema
**Audience:** Developers, engineers, technical leads

Each file includes:
- File locations in codebase
- Database schema and SQL queries
- API endpoints with request/response examples
- Component structure and relationships
- TypeScript types and interfaces
- Implementation details and patterns

### SOP/ - Standard Operating Procedures (Problems & Solutions)
**Purpose:** Documents recurring problems and their solutions
**Focus:** Troubleshooting, debugging, problem resolution
**Audience:** Support engineers, DevOps, developers

Each file documents:
- Problem description and symptoms
- Root cause analysis
- Solution implemented
- Prevention strategies
- Diagnostic procedures
- Verification steps

## Cross-Reference System

Every Tasks/*.md file includes a link to its corresponding System/*.md file:
```markdown
**Technical Documentation:** [../System/feature-name.md](../System/feature-name.md)
```

Every System/*.md file includes a link to its corresponding Tasks/*.md file:
```markdown
**Product Documentation:** [../Tasks/feature-name.md](../Tasks/feature-name.md)
```

This bi-directional linking makes it easy to navigate between product requirements and technical implementation.

## Feature List

The system includes the following documented features:

1. **Authentication** - Cookie-based auth with JWT tokens
2. **Business Switching** - Multi-tenant context management
3. **Dashboard** - Platform advertising spend metrics
4. **New Leads** - Lead management with three-table structure
5. **Lead Details** - Comprehensive lead information with call windows
6. **Actions** - AI-generated action checklist management
7. **Property Details** - Property information display
8. **Incoming Calls** - Call analytics with hover interactions
9. **Bookings** - Appointment metrics and trends
10. **Settings** - Profile management
11. **URL Structure** - Permalink-based routing with business_id

## Standard Operating Procedures

Current SOPs documented:

1. **Session Isolation Fix** - Resolved session mixing across browsers/devices
2. **Business Context Bleeding Fix** - Fixed cross-business data contamination
3. **Permalink URL Migration** - Migrated from `/{permalink}/` to `/{business_id}/{permalink}/`

## Documentation Principles

### 1. Truth Source: Code Over Documentation
When documentation conflicts with actual code implementation, the code is the source of truth. All documentation was verified against the current codebase.

### 2. Current State Only
Only the most recent implementation is documented. Outdated approaches and deprecated features are excluded to prevent confusion.

### 3. Clarity and Specificity
- File paths are always absolute
- Line numbers included where relevant
- SQL queries use real table/column names
- API endpoints include complete request/response examples

### 4. Maintainability
- Each feature has its own file (no monolithic documents)
- Consistent formatting across all files
- Clear section headers and structure
- Cross-references for easy navigation

## How to Use This Documentation

### For Product Questions
Start in `Tasks/` to understand what the feature does and why it exists.

### For Implementation Questions
Start in `System/` to see technical details, code locations, and implementation patterns.

### For Troubleshooting
Start in `SOP/` to find documented problems similar to what you're experiencing.

### For New Features
1. Read related Tasks/ files to understand existing patterns
2. Review related System/ files to understand technical architecture
3. Create new Tasks/ and System/ files for your feature
4. Add cross-references between them

### For Bug Fixes
1. Check SOP/ to see if this problem has occurred before
2. Review System/ files to understand the technical implementation
3. If the bug represents a pattern, create a new SOP/ file documenting it

## Maintenance Guidelines

### When to Update Documentation

**Update Tasks/ when:**
- Product requirements change
- User workflows are modified
- New edge cases are discovered
- Business value propositions change

**Update System/ when:**
- Code structure changes
- Database schema is modified
- API endpoints are added/changed
- New components are created
- Implementation patterns evolve

**Create SOP/ when:**
- A significant bug is fixed
- A recurring problem pattern is identified
- A complex troubleshooting procedure is established
- A deployment issue is resolved

### Documentation Review Cycle

Recommended review schedule:
- **Weekly:** Review SOP/ for new problems encountered
- **Monthly:** Verify System/ matches current codebase
- **Quarterly:** Review Tasks/ for product evolution
- **Major releases:** Comprehensive documentation audit

## Technical Stack

The system is built with:
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth (cookie-based JWT)
- **Deployment:** Docker (production)

## Quick Reference

### Most Important Files to Start With

**For Product Overview:**
- [Tasks/authentication.md](Tasks/authentication.md) - How users access the system
- [Tasks/url-structure.md](Tasks/url-structure.md) - How navigation works
- [Tasks/business-switching.md](Tasks/business-switching.md) - Multi-tenant context

**For Technical Architecture:**
- [System/authentication.md](System/authentication.md) - Auth flow and security
- [System/url-structure.md](System/url-structure.md) - Route resolution and validation
- [System/business-switching.md](System/business-switching.md) - Context isolation

**For Common Issues:**
- [SOP/session-isolation-fix.md](SOP/session-isolation-fix.md) - Session mixing problems
- [SOP/business-context-bleeding-fix.md](SOP/business-context-bleeding-fix.md) - Business data leakage

## Version History

- **v1.0** (2025-10-07): Initial documentation organization
  - Created Tasks/, System/, SOP/ structure
  - Documented 11 core features
  - Established 3 SOPs from historical issues
  - Added bi-directional cross-references
  - Removed redundant root-level .md files

## Contact and Support

For questions about this documentation structure or to suggest improvements, consult with the development team.

---

**Last Updated:** October 7, 2025
**Documentation Version:** 1.0
**Codebase State:** Permalink migration complete, business_id URL structure active
