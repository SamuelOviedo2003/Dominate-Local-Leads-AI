#!/bin/bash

# =========================================
# Repository Cleanup Script for Production Deployment
# =========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on the main branch
check_branch() {
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        log_error "This script should only be run on the 'main' branch"
        log_info "Current branch: $CURRENT_BRANCH"
        log_info "Switch to main branch: git checkout main"
        exit 1
    fi
    log_success "On main branch - proceeding with cleanup"
}

# Remove development documentation files
remove_docs() {
    log_info "Removing development documentation files..."
    
    DOCS_TO_REMOVE=(
        "CLAUDE.md"
        "INITIAL.md"
        "COLOR_EXTRACTION_OPTIMIZATION_IMPLEMENTATION.md"
        "DYNAMIC_COLOR_SYSTEM_GUIDE.md"
        "ENHANCEMENT_FILES_DOCUMENTATION.md"
        "IDEAL_FILE_STRUCTURE.md"
        "README-ENVIRONMENT.md"
    )
    
    for doc in "${DOCS_TO_REMOVE[@]}"; do
        if [ -f "$doc" ]; then
            rm "$doc"
            log_info "Removed: $doc"
        fi
    done
    
    log_success "Development documentation cleanup completed"
}

# Remove development artifacts
remove_artifacts() {
    log_info "Removing development artifacts..."
    
    ARTIFACTS_TO_REMOVE=(
        "performance-metrics.log"
        "database-cache-implementation.ts"
        "enhanced-business-switching.ts"
        "enhanced-rate-limiting.ts"
        "server-color-extraction.ts"
    )
    
    for artifact in "${ARTIFACTS_TO_REMOVE[@]}"; do
        if [ -f "$artifact" ]; then
            rm "$artifact"
            log_info "Removed: $artifact"
        fi
    done
    
    # Remove directories
    DIRS_TO_REMOVE=(
        ".playwright-mcp"
        "migrations"
    )
    
    for dir in "${DIRS_TO_REMOVE[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            log_info "Removed directory: $dir"
        fi
    done
    
    log_success "Development artifacts cleanup completed"
}

# Clean up any test or temporary files
remove_temp_files() {
    log_info "Removing temporary and test files..."
    
    # Remove any .log files (except those in logs directory)
    find . -name "*.log" -not -path "./logs/*" -not -path "./node_modules/*" -delete 2>/dev/null || true
    
    # Remove any .tmp files
    find . -name "*.tmp" -not -path "./node_modules/*" -delete 2>/dev/null || true
    
    # Remove any backup files
    find . -name "*~" -not -path "./node_modules/*" -delete 2>/dev/null || true
    find . -name "*.bak" -not -path "./node_modules/*" -delete 2>/dev/null || true
    
    log_success "Temporary files cleanup completed"
}

# Update .gitignore for production
update_gitignore() {
    log_info "Updating .gitignore for production..."
    
    # Add production-specific ignores if they don't exist
    PRODUCTION_IGNORES=(
        "# Production deployment"
        ".env.production"
        "logs/"
        "*.log"
        "# Docker volumes"
        "data/"
    )
    
    for ignore in "${PRODUCTION_IGNORES[@]}"; do
        if ! grep -q "$ignore" .gitignore 2>/dev/null; then
            echo "$ignore" >> .gitignore
        fi
    done
    
    log_success ".gitignore updated for production"
}

# Create essential directories
create_directories() {
    log_info "Creating essential directories..."
    
    # Create logs directory for Docker volumes
    mkdir -p logs/nginx
    
    # Create scripts directory if it doesn't exist
    mkdir -p scripts
    
    log_success "Essential directories created"
}

# Display what files are kept
show_kept_files() {
    log_info "Files and directories kept for production deployment:"
    echo ""
    echo "Essential Application Files:"
    echo "  - src/ (complete application source)"
    echo "  - public/ (static assets)"
    echo "  - package.json & package-lock.json"
    echo "  - next.config.js"
    echo "  - tsconfig.json"
    echo "  - tailwind.config.js"
    echo "  - postcss.config.js"
    echo "  - middleware.ts"
    echo ""
    echo "Docker & Deployment Files:"
    echo "  - Dockerfile"
    echo "  - .dockerignore"
    echo "  - docker-compose.yml"
    echo "  - docker-compose.prod.yml"
    echo "  - nginx.conf"
    echo ""
    echo "Environment & Configuration:"
    echo "  - .env.production.template"
    echo "  - .gitignore"
    echo ""
    echo "Documentation:"
    echo "  - DEPLOYMENT.md"
    echo "  - README.md (if exists)"
    echo ""
    echo "Scripts:"
    echo "  - scripts/build.sh"
    echo "  - scripts/cleanup-for-production.sh"
}

# Commit changes
commit_changes() {
    if [ "$1" = "--commit" ]; then
        log_info "Staging and committing changes..."
        
        git add -A
        git commit -m "feat: prepare main branch for production deployment

- Remove development documentation files
- Clean up development artifacts and temporary files
- Update configuration for production deployment
- Maintain only essential application and deployment files

🤖 Generated with Claude Code"
        
        log_success "Changes committed to main branch"
        log_warning "Remember to push these changes: git push origin main"
    else
        log_info "Changes staged but not committed. Run with --commit flag to commit changes."
        log_info "To commit manually: git add -A && git commit -m 'Clean up for production deployment'"
    fi
}

# Display summary
show_summary() {
    echo ""
    echo "==========================================="
    log_success "Production cleanup completed!"
    echo "==========================================="
    echo ""
    log_info "Next steps:"
    echo "1. Review the changes: git diff --cached"
    echo "2. Test the Docker build: ./scripts/build.sh"
    echo "3. Deploy using the deployment guide: DEPLOYMENT.md"
    echo ""
    log_warning "Main branch is now production-ready!"
}

# Main execution
main() {
    log_info "Starting production cleanup for Dominate Local Leads AI"
    echo "==========================================="
    
    check_branch
    remove_docs
    remove_artifacts
    remove_temp_files
    update_gitignore
    create_directories
    show_kept_files
    commit_changes "$1"
    show_summary
}

# Help function
show_help() {
    echo "Usage: $0 [--commit]"
    echo ""
    echo "Clean up repository for production deployment"
    echo ""
    echo "Options:"
    echo "  --commit    Automatically commit changes after cleanup"
    echo ""
    echo "This script will:"
    echo "  - Remove development documentation files"
    echo "  - Remove development artifacts and temporary files"
    echo "  - Update .gitignore for production"
    echo "  - Create essential directories"
    echo "  - Optionally commit changes to git"
    echo ""
    echo "Warning: This script should only be run on the 'main' branch"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac