#!/bin/bash

# Frontier Audio Deployment Script
# This script helps deploy the application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
AWS_REGION="us-east-1"

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
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists terraform; then
        print_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    print_status "All prerequisites are installed."
}

# Function to setup AWS credentials
setup_aws() {
    print_status "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_status "AWS credentials are configured."
}

# Function to initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    cd terraform
    
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating from example..."
        cp terraform.tfvars.example terraform.tfvars
        print_warning "Please edit terraform/terraform.tfvars with your actual values before continuing."
        print_warning "Required values: openai_api_key, aws_region"
        exit 1
    fi
    
    terraform init
    terraform validate
    cd ..
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure with Terraform..."
    cd terraform
    
    terraform plan -out=tfplan
    
    read -p "Do you want to apply these changes? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
        print_status "Infrastructure deployed successfully!"
    else
        print_warning "Deployment cancelled."
        exit 0
    fi
    
    cd ..
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Get ECR repository URLs from Terraform output
    cd terraform
    BACKEND_ECR_URL=$(terraform output -raw ecr_backend_repository_url)
    FRONTEND_ECR_URL=$(terraform output -raw ecr_frontend_repository_url)
    cd ..
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $BACKEND_ECR_URL
    
    # Build and push backend
    print_status "Building backend Docker image..."
    docker build -t $BACKEND_ECR_URL:latest ./backend
    docker push $BACKEND_ECR_URL:latest
    
    # Build and push frontend
    print_status "Building frontend Docker image..."
    docker build -t $FRONTEND_ECR_URL:latest ./frontend
    docker push $FRONTEND_ECR_URL:latest
    
    print_status "Docker images pushed successfully!"
}

# Function to update ECS services
update_services() {
    print_status "Updating ECS services..."
    
    cd terraform
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    BACKEND_SERVICE=$(terraform output -raw ecs_backend_service_name)
    FRONTEND_SERVICE=$(terraform output -raw ecs_frontend_service_name)
    cd ..
    
    # Force new deployment
    aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --force-new-deployment --region $AWS_REGION
    aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --force-new-deployment --region $AWS_REGION
    
    print_status "ECS services updated successfully!"
}

# Function to show deployment info
show_deployment_info() {
    print_status "Deployment completed successfully!"
    
    cd terraform
    ALB_URL=$(terraform output -raw alb_url)
    cd ..
    
    echo ""
    echo "🎉 Your application is now deployed!"
    echo "📱 Application URL: $ALB_URL"
    echo ""
    echo "Next steps:"
    echo "1. Set up your domain name (if using custom domain)"
    echo "2. Configure SSL certificate (if not already done)"
    echo "3. Set up monitoring and alerting"
    echo "4. Configure backup strategies"
    echo ""
}

# Main deployment function
main() {
    print_status "Starting Frontier Audio deployment..."
    
    check_prerequisites
    setup_aws
    init_terraform
    deploy_infrastructure
    build_and_push_images
    update_services
    show_deployment_info
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift
            shift
            ;;
        --region)
            AWS_REGION="$2"
            shift
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV    Set environment (default: production)"
            echo "  --region REGION      Set AWS region (default: us-east-1)"
            echo "  --help              Show this help message"
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
