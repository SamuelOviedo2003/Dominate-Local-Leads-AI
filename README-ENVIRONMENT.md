# Development Environment Guide

## 🎯 Quick Start

### Initial Setup
```bash
npm run setup
# or
./setup.sh
```

### Start Development
```bash
npm run dev
```

### Complete Cleanup
```bash
npm run clean:all
# or
./cleanup.sh
```

---

## 🔧 Environment Details

### Isolation Strategy
- **Local Dependencies**: All packages installed in `node_modules/` (no globals)
- **Self-Contained**: Everything runs from project directory
- **No System Impact**: No global installations or system modifications
- **Clean Exit**: Single command removes all traces

### What Gets Installed Locally
- Next.js 14.2.15 framework
- React 18.3.1 + React DOM
- TypeScript 5.6.3 + type definitions
- Tailwind CSS 3.4.14 + PostCSS + Autoprefixer
- Supabase client libraries
- ESLint + Next.js config
- Lucide React icons

### Directory Structure After Setup
```
Dominate Local Leads AI/
├── node_modules/          # All dependencies (433 packages)
├── .next/                 # Build cache (created on dev/build)
├── src/                   # Source code
├── public/                # Static assets
├── package.json           # Dependencies & scripts
├── package-lock.json      # Dependency lock file
├── cleanup.sh             # Complete cleanup script
├── setup.sh               # Environment setup script
└── README-ENVIRONMENT.md  # This guide
```

---

## 📝 Available Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint checks
```

### Environment Management
```bash
npm run setup        # Install all dependencies
npm run reset        # Clean everything + reinstall
```

### Cleanup (Individual)
```bash
npm run clean:cache     # Remove .next build cache
npm run clean:modules   # Remove node_modules
npm run clean:packages  # Remove package-lock.json
npm run clean:env       # Info about .env files
```

### Cleanup (Complete)
```bash
npm run clean:all    # Remove all artifacts via npm
./cleanup.sh         # Remove all artifacts via shell script
```

---

## 🧹 Cleanup Details

### What Gets Removed
- ✅ `node_modules/` (433 packages, ~200MB)
- ✅ `.next/` (build cache)
- ✅ `package-lock.json` (dependency locks)
- ✅ `tsconfig.tsbuildinfo` (TypeScript cache)
- ✅ `.eslintcache` (ESLint cache)

### What Gets Preserved
- ✅ Source code (`src/`, `public/`)
- ✅ Configuration files (`*.config.js`, `tsconfig.json`)
- ✅ Environment files (`.env.local`)
- ✅ Documentation (`*.md`)
- ✅ Project metadata (`package.json`)

### After Cleanup
- Project returns to original state
- No system-wide changes remain
- Can be safely deleted or archived
- Re-setup takes ~30 seconds

---

## 🔒 Security & Isolation

### No Global Dependencies
- Everything installed locally in `node_modules/`
- No `npm install -g` commands used
- No system PATH modifications
- No global npm packages required

### Environment Variables
- Stored in `.env.local` (gitignored)
- Preserved during cleanup for reuse
- Manually delete if sensitive data cleanup needed

### Supabase Integration
- Uses local Supabase client libraries
- No global Supabase CLI required for development
- Database access via environment variables only

---

## 🚨 Troubleshooting

### "next: command not found"
```bash
# This means dependencies aren't installed
npm run setup
```

### Permission Denied on Scripts
```bash
chmod +x setup.sh cleanup.sh
```

### Port 3000 Already in Use
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Clean Start After Issues
```bash
npm run reset
```

---

## 📊 Performance

### Installation Time
- Initial: ~30 seconds (433 packages)
- Cleanup: ~5 seconds
- Re-setup: ~30 seconds

### Storage Usage
- `node_modules/`: ~200MB
- `.next/` cache: ~10-50MB
- Total: ~250MB when running

### Network Usage
- Initial download: ~50MB
- Subsequent installs use npm cache

---

## 🎁 Benefits

✅ **Complete Isolation**: No system modifications
✅ **Easy Cleanup**: Single command removes everything  
✅ **Fast Setup**: Quick reinstall when needed
✅ **No Conflicts**: Isolated from other projects
✅ **Reproducible**: Same environment every time
✅ **Safe Exit**: Leave no traces when done