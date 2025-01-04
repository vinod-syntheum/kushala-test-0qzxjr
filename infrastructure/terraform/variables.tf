# Core environment configuration
variable "environment" {
  type        = string
  description = "Deployment environment (staging/production) for resource configuration"
  
  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either 'staging' or 'production'"
  }
}

# AWS region configuration
variable "region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be a valid AWS region identifier"
  }
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC network configuration"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Database configuration
variable "database_instance_class" {
  type        = string
  description = "RDS instance type for PostgreSQL database"
  default     = "db.t3.medium"
  
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.database_instance_class))
    error_message = "Database instance class must be a valid RDS instance type"
  }
}

# Cache configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type for Redis cache"
  default     = "cache.t3.medium"
  
  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache node type"
  }
}

# Container orchestration configuration
variable "ecs_instance_type" {
  type        = string
  description = "EC2 instance type for ECS cluster nodes"
  default     = "t3.medium"
  
  validation {
    condition     = can(regex("^[a-z0-9]+\\.[a-z0-9]+$", var.ecs_instance_type))
    error_message = "ECS instance type must be a valid EC2 instance type"
  }
}

# High availability configuration
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment"
  default     = ["us-east-1a", "us-east-1b"]
  
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified for high availability"
  }
}

# Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  default     = 7
  
  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days"
  }
}