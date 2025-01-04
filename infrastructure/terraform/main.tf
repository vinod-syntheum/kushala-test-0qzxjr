# Provider and Terraform configuration
# AWS Provider version ~> 5.0
# Random Provider version ~> 3.0
terraform {
  required_version = ">= 1.0.0"

  backend "s3" {
    bucket         = "digital-presence-mvp-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
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

# Configure AWS Provider
provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# Local variables
locals {
  environment   = var.environment
  region        = var.region
  project_name  = "digital-presence-mvp"
  
  tags = {
    Project     = "digital-presence-mvp"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Networking Module - VPC, Subnets, Security Groups
module "networking" {
  source = "./modules/networking"

  vpc_cidr            = var.vpc_cidr
  environment         = local.environment
  region              = local.region
  availability_zones  = var.availability_zones
  project_name        = local.project_name

  tags = local.tags
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  environment         = local.environment
  project_name        = local.project_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  ecs_security_group = module.networking.ecs_security_group_id

  tags = local.tags

  depends_on = [module.networking]
}

# RDS Database
module "database" {
  source = "./modules/database"

  environment            = local.environment
  project_name          = local.project_name
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  database_subnet_group = module.networking.database_subnet_group
  instance_class        = var.database_instance_class
  backup_retention_days = var.backup_retention_days

  tags = local.tags

  depends_on = [module.networking]
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"

  environment         = local.environment
  project_name        = local.project_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  redis_subnet_group = module.networking.redis_subnet_group
  node_type          = var.redis_node_type

  tags = local.tags

  depends_on = [module.networking]
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  environment        = local.environment
  project_name       = local.project_name
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids

  tags = local.tags

  depends_on = [module.networking]
}

# S3 Buckets for Media Storage
module "storage" {
  source = "./modules/storage"

  environment  = local.environment
  project_name = local.project_name

  tags = local.tags
}

# CloudWatch Monitoring and Logs
module "monitoring" {
  source = "./modules/monitoring"

  environment  = local.environment
  project_name = local.project_name
  
  ecs_cluster_name = module.ecs.cluster_name
  rds_instance_id = module.database.instance_id

  tags = local.tags

  depends_on = [module.ecs, module.database]
}

# Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.networking.vpc_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "rds_endpoint" {
  description = "Endpoint of the RDS database"
  value       = module.database.endpoint
  sensitive   = true
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = module.alb.dns_name
}

output "redis_endpoint" {
  description = "Endpoint of the Redis cluster"
  value       = module.redis.endpoint
  sensitive   = true
}

output "media_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  value       = module.storage.media_bucket_name
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = module.monitoring.log_group_name
}