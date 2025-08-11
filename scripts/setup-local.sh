#!/bin/bash

# Frontier Audio Local Development Setup Script
# This script helps set up the local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 20+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_warning "Docker is not installed. Docker is required for containerized development."
        print_warning "You can still run the application without Docker, but some features may not work."
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="20.0.0"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 20 or later."
        exit 1
    fi
    
    print_status "Prerequisites check completed."
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    if [ ! -f ".env" ]; then
        if [ -f "environment.example" ]; then
            cp environment.example .env
            print_warning "Created .env file from environment.example"
            print_warning "Please edit .env with your actual values, especially OPENAI_API_KEY"
        else
            print_error "environment.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_status ".env file already exists."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend
    npm ci
    cd ..
    
    print_status "Installing frontend dependencies..."
    cd frontend
    npm ci
    cd ..
    
    print_status "Dependencies installed successfully."
}

# Build applications
build_applications() {
    print_status "Building backend..."
    cd backend
    npm run build
    cd ..
    
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    print_status "Applications built successfully."
}

# Run quality checks
run_quality_checks() {
    print_status "Running quality checks..."
    
    print_status "Checking backend..."
    cd backend
    npm run typecheck
    npm run lint
    npm run format:check
    cd ..
    
    print_status "Checking frontend..."
    cd frontend
    npm run typecheck
    npm run lint
    npm run format:check
    cd ..
    
    print_status "Quality checks passed."
}

# Setup Docker
setup_docker() {
    if command_exists docker; then
        print_status "Setting up Docker environment..."
        
        if command_exists docker-compose; then
            print_status "Building Docker images..."
            docker-compose build
            print_status "Docker images built successfully."
        else
            print_warning "docker-compose not found. You can still use individual Docker commands."
        fi
    else
        print_warning "Docker not available. Skipping Docker setup."
    fi
}

# Show usage instructions
show_usage() {
    print_status "Setup completed successfully!"
    
    echo ""
    echo "🎉 Your local development environment is ready!"
    echo ""
    echo "📋 Available commands:"
    echo ""
    echo "Development (without Docker):"
    echo "  Backend:  cd backend && npm run dev"
    echo "  Frontend: cd frontend && npm run dev"
    echo ""
    echo "Development (with Docker):"
    echo "  All services: docker-compose up"
    echo "  Backend only: docker-compose up backend"
    echo "  Frontend only: docker-compose up frontend"
    echo ""
    echo "Quality checks:"
    echo "  Backend:  cd backend && npm run check-all"
    echo "  Frontend: cd frontend && npm run check-all"
    echo ""
    echo "🔧 Configuration:"
    echo "  1. Edit .env file with your actual values"
    echo "  2. Ensure OPENAI_API_KEY is set in .env"
    echo "  3. Database file should be in backend/ directory"
    echo ""
    echo "📚 URLs (when running):"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend API: http://localhost:3001"
    echo "  WebSocket: ws://localhost:8080"
    echo ""
}

# Main setup function
main() {
    print_status "Starting Frontier Audio local development setup..."
    
    check_prerequisites
    setup_environment
    install_dependencies
    build_applications
    run_quality_checks
    setup_docker
    show_usage
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-docker    Skip Docker setup"
            echo "  --skip-build     Skip building applications"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
