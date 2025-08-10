# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = false
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = 7

  tags = {
    Name = "${local.name_prefix}-ecs-logs"
  }
}

# CloudWatch Log Group for Backend
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = 7

  tags = {
    Name = "${local.name_prefix}-backend-logs"
  }
}

# CloudWatch Log Group for Frontend
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name_prefix}/frontend"
  retention_in_days = 7

  tags = {
    Name = "${local.name_prefix}-frontend-logs"
  }
}

# ECS Task Definition for Backend
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        },
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3001"
        }
      ]

      secrets = [
        {
          name      = "OPENAI_API_KEY"
          valueFrom = aws_ssm_parameter.openai_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-backend-task"
  }
}

# ECS Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name_prefix}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]

      secrets = var.picovoice_access_key != "" ? [
        {
          name      = "VITE_PICOVOICE_ACCESS_KEY"
          valueFrom = aws_ssm_parameter.picovoice_access_key[0].arn
        }
      ] : []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:80/ || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 30
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-frontend-task"
  }
}

# ECS Service for Backend
resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_capacity
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.backend.id]
    subnets          = data.aws_subnets.default.ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend_api.arn
    container_name   = "backend"
    container_port   = 3001
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend_ws.arn
    container_name   = "backend"
    container_port   = 8080
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener_rule.api,
    aws_lb_listener_rule.websocket
  ]

  tags = {
    Name = "${local.name_prefix}-backend-service"
  }
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${local.name_prefix}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.desired_capacity
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.frontend.id]
    subnets          = data.aws_subnets.default.ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [
    aws_lb_listener.http
  ]

  tags = {
    Name = "${local.name_prefix}-frontend-service"
  }
}
