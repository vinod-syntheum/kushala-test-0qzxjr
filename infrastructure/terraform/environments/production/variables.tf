# Production environment identifier
variable "environment" {
  type        = string
  description = "Production environment identifier"
  default     = "production"

  validation {
    condition     = var.environment == "production"
    error_message = "This is a production-only configuration"
  }
}

# AWS region for production deployment
variable "region" {
  type        = string
  description = "AWS region for production deployment"
  default     = "us-east-1"
}

# Production VPC network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for production VPC network"
  default     = "10.0.0.0/16"
}

# High availability configuration
variable "az_count" {
  type        = number
  description = "Number of availability zones for high availability"
  default     = 3

  validation {
    condition     = var.az_count >= 3
    error_message = "Production requires at least 3 availability zones for high availability"
  }
}

# Production database configuration
variable "database_instance_class" {
  type        = string
  description = "RDS instance type for production PostgreSQL database"
  default     = "db.r6g.xlarge"

  validation {
    condition     = can(regex("^db\\.r6g\\.(large|xlarge|2xlarge)$", var.database_instance_class))
    error_message = "Production database must use r6g instance family for optimal performance"
  }
}

# Production cache configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type for production Redis cluster"
  default     = "cache.r6g.large"

  validation {
    condition     = can(regex("^cache\\.r6g\\.(large|xlarge)$", var.redis_node_type))
    error_message = "Production cache must use r6g instance family for optimal performance"
  }
}

# Container configuration
variable "ecs_instance_type" {
  type        = string
  description = "ECS Fargate task CPU and memory configuration"
  default     = "512,1024"

  validation {
    condition     = can(regex("^(512|1024|2048),(1024|2048|4096)$", var.ecs_instance_type))
    error_message = "ECS task configuration must follow Fargate supported CPU/memory combinations"
  }
}

# High availability toggle
variable "enable_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for production services"
  default     = true

  validation {
    condition     = var.enable_multi_az == true
    error_message = "Multi-AZ must be enabled for production environment"
  }
}

# Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 30
    error_message = "Production environment requires minimum 30 days backup retention"
  }
}

# Monitoring configuration
variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 30

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of [0, 1, 5, 10, 15, 30, 60]"
  }
}