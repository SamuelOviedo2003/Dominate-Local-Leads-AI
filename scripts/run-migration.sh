#!/bin/bash

# Migration Runner Script for Supabase Database
# Usage: ./scripts/run-migration.sh <migration-file>
# Example: ./scripts/run-migration.sh migrations/add-time-speed-column-migration.sql

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if migration file is provided
if [ $# -eq 0 ]; then
    print_error "No migration file specified"
    echo "Usage: $0 <migration-file>"
    echo "Example: $0 migrations/add-time-speed-column-migration.sql"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

print_info "Starting database migration..."
print_info "Migration file: $MIGRATION_FILE"

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_error "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
    print_warning "Neither SUPABASE_SERVICE_KEY nor SUPABASE_ANON_KEY found"
    print_info "You'll need to run this migration manually in your Supabase dashboard"
fi

# Use SUPABASE_URL if available, otherwise use NEXT_PUBLIC_SUPABASE_URL
DB_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}

print_info "Database URL: ${DB_URL}"
print_info "Reading migration file..."

# Show the migration SQL for review
echo ""
print_info "Migration SQL to be executed:"
echo "----------------------------------------"
cat "$MIGRATION_FILE"
echo "----------------------------------------"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with this migration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Migration cancelled by user"
    exit 0
fi

print_info "Proceeding with migration..."

# Instructions for manual execution
echo ""
print_info "To execute this migration:"
print_info "1. Go to your Supabase dashboard"
print_info "2. Navigate to the SQL Editor"
print_info "3. Copy and paste the SQL from: $MIGRATION_FILE"
print_info "4. Click 'Run' to execute the migration"
echo ""

print_success "Migration file prepared: $MIGRATION_FILE"
print_success "Please execute the SQL manually in your Supabase dashboard"

# Log the migration attempt
echo "$(date): Migration prepared: $MIGRATION_FILE" >> migration.log

print_info "Migration preparation completed successfully!"