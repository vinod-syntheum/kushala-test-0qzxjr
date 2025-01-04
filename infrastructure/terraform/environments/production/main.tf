# Provider and Terraform configuration
# AWS Provider version: ~> 5.0
# Random Provider version: ~> 3.0
terraform {
  required_version = ">= 1.0.0"

  backend "s3" {
    bucket         = "digital-presence-mvp-tfstate-prod"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock-prod"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# AWS Provider configuration with production settings
provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# Local variables for production environment
locals {
  environment   = "production"
  project_name  = "digital-presence-mvp"
  
  # Production-specific tags
  tags = {
    Environment = local.environment
    Project     = local.project_name
    ManagedBy   = "terraform"
  }

  # Production networking configuration
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets   = [for i, az in local.availability_zones : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets    = [for i, az in local.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + length(local.availability_zones))]
}

# Production VPC and networking configuration
module "networking" {
  source = "../../modules/networking"

  vpc_cidr            = var.vpc_cidr
  environment         = local.environment
  region             = var.region
  availability_zones  = local.availability_zones
  private_subnets     = local.private_subnets
  public_subnets      = local.public_subnets
  
  # Production-specific networking settings
  enable_nat_gateway     = true
  single_nat_gateway     = false  # Use multiple NAT gateways for HA
  enable_vpn_gateway     = true
  enable_dns_hostnames   = true
  enable_dns_support     = true
  
  # Enhanced network logging and monitoring
  enable_flow_log                      = true
  flow_log_destination_type           = "cloudwatch"
  flow_log_traffic_type              = "ALL"
  flow_log_max_aggregation_interval  = 60

  tags = local.tags
}

# Production ECS cluster configuration
module "ecs" {
  source = "../../modules/ecs"

  cluster_name         = "${local.project_name}-${local.environment}"
  environment         = local.environment
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  
  # Production capacity providers configuration
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE"
      weight           = 60
      base             = 20
    },
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 40
      base             = 0
    }
  ]

  # Enhanced monitoring and logging
  enable_container_insights = true
  enable_execute_command   = true

  tags = local.tags
}

# Production security group configuration
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${local.project_name}-${local.environment}-ecs-tasks"
  vpc_id      = module.networking.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.project_name}-${local.environment}-ecs-tasks"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Production ALB security group
resource "aws_security_group" "alb" {
  name_prefix = "${local.project_name}-${local.environment}-alb"
  vpc_id      = module.networking.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${local.project_name}-${local.environment}-alb"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Output production infrastructure values
output "vpc_id" {
  description = "ID of the production VPC"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the production private subnets"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the production public subnets"
  value       = module.networking.public_subnet_ids
}

output "ecs_cluster_name" {
  description = "Name of the production ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_id" {
  description = "ID of the production ECS cluster"
  value       = module.ecs.cluster_id
}

output "alb_security_group_id" {
  description = "ID of the production ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  description = "ID of the production ECS tasks security group"
  value       = aws_security_group.ecs_tasks.id
}