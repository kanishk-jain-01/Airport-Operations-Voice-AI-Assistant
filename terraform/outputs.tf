output "vpc_id" {
  description = "ID of the default VPC"
  value       = data.aws_vpc.default.id
}

output "default_subnets" {
  description = "IDs of the default subnets"
  value       = data.aws_subnets.default.ids
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_url" {
  description = "URL of the application"
  value       = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service_name" {
  description = "Name of the backend ECS service"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = aws_ecs_service.frontend.name
}

output "cloudwatch_log_group_backend" {
  description = "CloudWatch log group for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_log_group_frontend" {
  description = "CloudWatch log group for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "ssm_openai_api_key_parameter" {
  description = "SSM parameter name for OpenAI API key"
  value       = aws_ssm_parameter.openai_api_key.name
  sensitive   = true
}

output "ssm_picovoice_access_key_parameter" {
  description = "SSM parameter name for Picovoice access key (if configured)"
  value       = var.picovoice_access_key != "" ? aws_ssm_parameter.picovoice_access_key[0].name : "Not configured"
  sensitive   = true
}
