#!/bin/bash

# =========================================
# Production Build Script for Dominate Local Leads AI
# =========================================

set -e  # Exit on any error

# Configuration
IMAGE_NAME="dominate-leads-ai"
BUILD_VERSION=${1:-latest}
NODE_VERSION="20.18.0"
ALPINE_VERSION="3.20"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    
    # Remove dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        docker rmi $(docker images -f "dangling=true" -q) || true
    fi
    
    # Clean build cache
    docker builder prune -f || true
    
    log_success "Build cleanup completed"
}

# Build the Docker image
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${BUILD_VERSION}"
    
    # Get build arguments from environment or use defaults
    BUILD_ARGS=""
    if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        BUILD_ARGS="$BUILD_ARGS --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL"
    fi
    if [ ! -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" ]; then
        BUILD_ARGS="$BUILD_ARGS --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
    fi
    
    # Build the image
    docker build \
        --build-arg NODE_VERSION=$NODE_VERSION \
        --build-arg ALPINE_VERSION=$ALPINE_VERSION \
        $BUILD_ARGS \
        --tag ${IMAGE_NAME}:${BUILD_VERSION} \
        --tag ${IMAGE_NAME}:latest \
        .
    
    log_success "Docker image built successfully"
}

# Test the built image
test_image() {
    log_info "Testing the built image..."
    
    # Start container for testing
    CONTAINER_ID=$(docker run -d \
        --name test-${IMAGE_NAME}-${BUILD_VERSION} \
        -p 3001:3000 \
        ${IMAGE_NAME}:${BUILD_VERSION})
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        log_success "Health check passed"
        TEST_RESULT=0
    else
        log_error "Health check failed"
        TEST_RESULT=1
    fi
    
    # Cleanup test container
    docker stop $CONTAINER_ID > /dev/null
    docker rm $CONTAINER_ID > /dev/null
    
    if [ $TEST_RESULT -eq 0 ]; then
        log_success "Image testing completed successfully"
    else
        log_error "Image testing failed"
        exit 1
    fi
}

# Display image information
show_image_info() {
    log_info "Image build information:"
    
    IMAGE_SIZE=$(docker images ${IMAGE_NAME}:${BUILD_VERSION} --format "table {{.Size}}" | tail -n 1)
    IMAGE_ID=$(docker images ${IMAGE_NAME}:${BUILD_VERSION} --format "table {{.ID}}" | tail -n 1)
    
    echo "  Image Name: ${IMAGE_NAME}:${BUILD_VERSION}"
    echo "  Image ID: ${IMAGE_ID}"
    echo "  Image Size: ${IMAGE_SIZE}"
    echo "  Node Version: ${NODE_VERSION}"
    echo "  Alpine Version: ${ALPINE_VERSION}"
}

# Main execution
main() {
    log_info "Starting build process for Dominate Local Leads AI"
    echo "==========================================="
    
    check_prerequisites
    clean_build
    build_image
    test_image
    show_image_info
    
    echo "==========================================="
    log_success "Build process completed successfully!"
    echo ""
    log_info "To run the container:"
    echo "  docker run -d --name dominate-leads-app -p 3000:3000 ${IMAGE_NAME}:${BUILD_VERSION}"
    echo ""
    log_info "To push to registry:"
    echo "  docker push ${IMAGE_NAME}:${BUILD_VERSION}"
}

# Help function
show_help() {
    echo "Usage: $0 [VERSION]"
    echo ""
    echo "Build Docker image for Dominate Local Leads AI"
    echo ""
    echo "Arguments:"
    echo "  VERSION    Image version tag (default: latest)"
    echo ""
    echo "Environment Variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL       Supabase project URL"
    echo "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY  Supabase anonymous key"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build with 'latest' tag"
    echo "  $0 v1.0.0            # Build with 'v1.0.0' tag"
    echo "  $0 main-$(date +%Y%m%d)  # Build with date-based tag"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac