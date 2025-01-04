# Core ECS Cluster Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.cluster_name))
    error_message = "Cluster name must contain only alphanumeric characters and hyphens."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment identifier (e.g., staging, production)"
  
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

# Network Configuration
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where ECS resources will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ECS task deployment"
  
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets must be provided for high availability."
  }
}

# Container Resource Configuration
variable "container_cpu" {
  type        = number
  description = "Number of CPU units for the ECS tasks (1024 units = 1 vCPU)"
  default     = 1024
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.container_cpu)
    error_message = "CPU units must be one of: 256, 512, 1024, 2048, or 4096."
  }
}

variable "container_memory" {
  type        = number
  description = "Amount of memory (in MiB) for the ECS tasks"
  default     = 2048
  
  validation {
    condition     = var.container_memory >= 512 && var.container_memory <= 30720
    error_message = "Memory must be between 512 MiB and 30720 MiB."
  }
}

# Service Configuration
variable "desired_count" {
  type        = number
  description = "Desired number of container instances to run"
  default     = 2
  
  validation {
    condition     = var.desired_count > 0
    error_message = "Desired count must be greater than 0."
  }
}

variable "availability_zone_count" {
  type        = number
  description = "Number of availability zones to distribute tasks across"
  default     = 2
  
  validation {
    condition     = var.availability_zone_count >= 2 && var.availability_zone_count <= 3
    error_message = "Number of availability zones must be between 2 and 3."
  }
}

# Auto Scaling Configuration
variable "enable_auto_scaling" {
  type        = bool
  description = "Enable auto-scaling for the ECS service"
  default     = true
}

variable "max_capacity" {
  type        = number
  description = "Maximum number of tasks when using auto-scaling"
  default     = 4
  
  validation {
    condition     = var.max_capacity >= 1
    error_message = "Maximum capacity must be at least 1."
  }
}

variable "min_capacity" {
  type        = number
  description = "Minimum number of tasks when using auto-scaling"
  default     = 2
  
  validation {
    condition     = var.min_capacity >= 1
    error_message = "Minimum capacity must be at least 1."
  }
}

# Monitoring Configuration
variable "container_insights" {
  type        = bool
  description = "Enable CloudWatch Container Insights for the cluster"
  default     = true
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Map of tags to apply to all ECS resources"
  default     = {}
  
  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags can be specified."
  }
}