# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws" # v5.0
      version = "~> 5.0"
    }
  }
}

# CloudWatch Log Group for ECS cluster
resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/aws/ecs/${var.cluster_name}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-logs"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ECS Cluster with enhanced configuration
resource "aws_ecs_cluster" "main" {
  name = "${var.cluster_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = var.container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_cluster.name
      }
    }
  }

  tags = {
    Name        = "${var.cluster_name}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Capacity providers for the cluster
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    weight            = 3
    capacity_provider = "FARGATE_SPOT"
  }
}

# Service discovery namespace for ECS services
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.environment}.local"
  description = "Service discovery namespace for ${var.cluster_name} ECS services"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-service-discovery"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.cluster_name}-${var.environment}-tasks-"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = []
    self            = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-tasks"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# IAM role for ECS task execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.cluster_name}-${var.environment}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-task-execution"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM role for ECS tasks
resource "aws_iam_role" "ecs_task" {
  name = "${var.cluster_name}-${var.environment}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-task-role"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Outputs for use in other modules
output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "service_discovery_namespace_id" {
  description = "The ID of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "task_execution_role_arn" {
  description = "The ARN of the task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "The ARN of the task role"
  value       = aws_iam_role.ecs_task.arn
}

output "task_security_group_id" {
  description = "The ID of the security group for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}