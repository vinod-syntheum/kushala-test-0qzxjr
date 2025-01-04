# Provider and Terraform configuration
# AWS Provider version ~> 5.0
# Random Provider version ~> 3.0
terraform {
  required_version = ">= 1.0.0"

  backend "s3" {
    bucket         = "digital-presence-mvp-staging-tfstate"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks-staging"
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

# Configure AWS Provider for staging environment
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = local.project_name
      ManagedBy   = "terraform"
    }
  }
}

# Local variables
locals {
  environment   = "staging"
  region        = "us-east-1"
  project_name  = "digital-presence-mvp"
  
  # Common tags for all resources
  tags = merge(
    var.tags,
    {
      Environment = local.environment
      Project     = local.project_name
      ManagedBy   = "terraform"
    }
  )
}

# Networking module for staging environment (Single AZ)
module "networking" {
  source = "../../modules/networking"

  vpc_cidr            = var.vpc_cidr
  environment         = local.environment
  az_count           = 1  # Single AZ for staging
  enable_nat_gateway = true
  single_nat_gateway = true  # Cost optimization for staging

  tags = local.tags
}

# ECS module for container orchestration
module "ecs" {
  source = "../../modules/ecs"

  cluster_name            = "${local.environment}-cluster"
  vpc_id                 = module.networking.vpc_id
  private_subnet_ids     = module.networking.private_subnet_ids
  environment            = local.environment
  enable_container_insights = true

  # Staging-specific ECS configurations
  desired_capacity       = 1
  min_capacity          = 1
  max_capacity          = 2

  tags = local.tags
}

# Output values for reference in other configurations
output "vpc_id" {
  description = "ID of the VPC created for staging environment"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets in the staging VPC"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets in the staging VPC"
  value       = module.networking.public_subnet_ids
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster for staging environment"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster for staging environment"
  value       = module.ecs.cluster_id
}

output "service_discovery_namespace" {
  description = "Service discovery namespace for ECS services"
  value       = module.ecs.service_discovery_namespace
}