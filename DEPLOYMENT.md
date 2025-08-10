# Frontier Audio - Deployment Guide

This guide covers the complete deployment setup for the Frontier Audio application, including Docker containerization, AWS infrastructure provisioning with Terraform, and CI/CD pipelines with GitHub Actions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [AWS Infrastructure Setup](#aws-infrastructure-setup)
5. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
6. [Deployment Process](#deployment-process)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The application uses a microservices architecture deployed on AWS:

```
┌─────────────────┐    ┌─────────────────┐
│   Internet      │    │   Route 53      │
│   Gateway       │    │   (Optional)    │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Application     │    │   CloudFront    │
│ Load Balancer   │    │   (Optional)    │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │
│   (React/Nginx) │    │   (Node.js)     │
│   ECS Fargate   │    │   ECS Fargate   │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   ECR           │    │   CloudWatch    │
│   Repositories  │    │   Logs          │
└─────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React application with Vite, served by Nginx
- **Backend**: Node.js application with Express and WebSocket server
- **Database**: SQLite (loaded into memory at startup)
- **Infrastructure**: AWS ECS Fargate with Application Load Balancer
- **Storage**: AWS ECR for Docker images
- **Monitoring**: CloudWatch for logs and metrics
- **Secrets**: AWS Systems Manager Parameter Store

## Prerequisites

### Software Requirements

1. **Node.js** (v20 or later)
2. **Docker** (v24 or later)
3. **AWS CLI** (v2)
4. **Terraform** (v1.0 or later)
5. **Git**

### AWS Requirements

1. **AWS Account** with appropriate permissions
2. **AWS CLI configured** with access keys
3. **ECR permissions** for pushing Docker images
4. **ECS permissions** for managing services
5. **VPC and networking permissions**

### GitHub Requirements

1. **GitHub repository** with Actions enabled
2. **AWS credentials** configured as GitHub secrets

## Local Development Setup

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd frontier-audio
   ```

2. **Run the setup script:**
   ```bash
   ./scripts/setup-local.sh
   ```

3. **Configure environment:**
   ```bash
   cp environment.example .env
   # Edit .env with your actual values
   ```

4. **Start development servers:**
   ```bash
   # Option 1: Using Docker Compose
   docker-compose up
   
   # Option 2: Running natively
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

### Manual Setup

If you prefer manual setup or the script doesn't work:

1. **Install dependencies:**
   ```bash
   cd backend && npm ci && cd ..
   cd frontend && npm ci && cd ..
   ```

2. **Build applications:**
   ```bash
   cd backend && npm run build && cd ..
   cd frontend && npm run build && cd ..
   ```

3. **Run quality checks:**
   ```bash
   cd backend && npm run check-all && cd ..
   cd frontend && npm run check-all && cd ..
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Configuration
NODE_ENV=development
PORT=3001

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Frontend Configuration
VITE_BACKEND_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:8080

# Docker Configuration
COMPOSE_PROJECT_NAME=frontier-audio
```

## AWS Infrastructure Setup

### Step 1: Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter output format (json)
```

### Step 2: Configure Terraform Variables

1. **Copy the example file:**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars:**
   ```hcl
   # AWS Configuration
   aws_region = "us-east-1"
   environment = "production"
   project_name = "frontier-audio"
   
   # Network Configuration
   vpc_cidr = "10.0.0.0/16"
   public_subnet_cidrs = ["10.0.101.0/24", "10.0.102.0/24"]
   private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
   
   # SSL Certificate (Optional)
   certificate_arn = ""
   domain_name = ""
   
   # ECS Configuration
   backend_cpu = 256
   backend_memory = 512
   frontend_cpu = 256
   frontend_memory = 512
   
   # Auto Scaling
   min_capacity = 1
   max_capacity = 10
   desired_capacity = 2
   
   # Secrets
   openai_api_key = "your-openai-api-key-here"
   ```

### Step 3: Deploy Infrastructure

1. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan the deployment:**
   ```bash
   terraform plan
   ```

3. **Apply the infrastructure:**
   ```bash
   terraform apply
   ```

4. **Note the outputs:**
   ```bash
   terraform output
   ```

### Infrastructure Components Created

- **VPC** with public and private subnets across 2 AZs
- **Application Load Balancer** with target groups
- **ECS Cluster** with Fargate services
- **ECR Repositories** for Docker images
- **Security Groups** with minimal required access
- **IAM Roles** for ECS tasks and auto-scaling
- **CloudWatch Log Groups** for application logs
- **SSM Parameters** for secure secret storage
- **Auto Scaling** policies for high availability

## CI/CD Pipeline Setup

### Step 1: Configure GitHub Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add:

```
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

### Step 2: Update Workflow Variables

Edit `.github/workflows/deploy-main.yml` and update the environment variables:

```yaml
env:
  AWS_REGION: us-east-1  # Your AWS region
  ECR_BACKEND_REPOSITORY: frontier-audio-production-backend
  ECR_FRONTEND_REPOSITORY: frontier-audio-production-frontend
  ECS_CLUSTER: frontier-audio-production-cluster
  ECS_BACKEND_SERVICE: frontier-audio-production-backend
  ECS_FRONTEND_SERVICE: frontier-audio-production-frontend
```

### Step 3: Branch Strategy

- **dev branch**: Used for development, triggers CI pipeline
- **main branch**: Used for production, triggers CI/CD pipeline with deployment

### Pipeline Stages

1. **Lint and Test**: TypeScript checking, ESLint, Prettier
2. **Build Docker Images**: Build and push to ECR
3. **Deploy to ECS**: Update task definitions and services
4. **Notify**: Report deployment status

## Deployment Process

### Automated Deployment (Recommended)

1. **Push to main branch:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

2. **Monitor GitHub Actions:**
   - Go to your repository's Actions tab
   - Watch the deployment progress
   - Check for any errors

### Manual Deployment

1. **Use the deployment script:**
   ```bash
   ./scripts/deploy.sh
   ```

2. **Or deploy step by step:**
   ```bash
   # 1. Build and push images
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ecr-url>
   docker build -t <ecr-url>:latest ./backend
   docker push <ecr-url>:latest
   
   # 2. Update ECS services
   aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
   ```

### Rollback Process

1. **Using ECS Console:**
   - Go to ECS > Clusters > Services
   - Click "Update Service"
   - Select previous task definition revision
   - Update the service

2. **Using AWS CLI:**
   ```bash
   aws ecs update-service --cluster <cluster-name> --service <service-name> --task-definition <previous-task-def-arn>
   ```

## Monitoring and Maintenance

### CloudWatch Monitoring

1. **Application Logs:**
   - Backend: `/ecs/frontier-audio-production/backend`
   - Frontend: `/ecs/frontier-audio-production/frontend`

2. **Metrics to Monitor:**
   - CPU and Memory utilization
   - Request count and response times
   - Error rates
   - Auto-scaling events

### Health Checks

- **Backend**: `GET /health` endpoint
- **Frontend**: Root path availability
- **Load Balancer**: Automatic health checking

### Maintenance Tasks

1. **Regular Updates:**
   - Update Node.js dependencies
   - Update Docker base images
   - Update Terraform providers

2. **Security:**
   - Rotate AWS access keys
   - Update OpenAI API key if needed
   - Review security groups and IAM policies

3. **Cost Optimization:**
   - Review auto-scaling settings
   - Monitor AWS costs
   - Optimize resource allocation

## Troubleshooting

### Common Issues

1. **Docker Build Failures:**
   ```bash
   # Check Dockerfile syntax
   docker build --no-cache -t test ./backend
   
   # Check for missing dependencies
   cd backend && npm audit
   ```

2. **ECS Service Issues:**
   ```bash
   # Check service status
   aws ecs describe-services --cluster <cluster> --services <service>
   
   # Check task logs
   aws logs get-log-events --log-group-name <log-group> --log-stream-name <stream>
   ```

3. **Load Balancer Issues:**
   ```bash
   # Check target group health
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   ```

4. **Terraform Issues:**
   ```bash
   # Refresh state
   terraform refresh
   
   # Import existing resources
   terraform import <resource-type>.<name> <resource-id>
   ```

### Getting Help

1. **Check CloudWatch Logs** for application errors
2. **Review GitHub Actions** logs for deployment issues
3. **Check AWS Console** for infrastructure status
4. **Validate configuration** files for syntax errors

### Emergency Contacts

- **AWS Support**: Use AWS Support Center
- **GitHub Support**: Use GitHub Support
- **Application Team**: [Your contact information]

## Cost Estimation

Estimated monthly costs for production deployment:

- **ECS Fargate**: ~$30-50 (for 2 tasks running continuously)
- **Application Load Balancer**: ~$20
- **CloudWatch Logs**: ~$5-10
- **Data Transfer**: ~$5-15
- **ECR Storage**: ~$1-5

**Total**: Approximately $60-100/month for a small production deployment.

## Security Considerations

1. **Network Security**: Private subnets for application tiers
2. **Access Control**: IAM roles with minimal permissions
3. **Secret Management**: AWS Systems Manager Parameter Store
4. **Container Security**: Regular image scanning enabled
5. **Transport Security**: HTTPS/TLS encryption (when certificate configured)

## Next Steps

After successful deployment:

1. **Configure Custom Domain**: Set up Route 53 and SSL certificate
2. **Set up Monitoring**: Configure CloudWatch alarms and dashboards
3. **Implement Backup Strategy**: For application data and configurations
4. **Performance Optimization**: Monitor and optimize resource allocation
5. **Security Hardening**: Regular security reviews and updates
