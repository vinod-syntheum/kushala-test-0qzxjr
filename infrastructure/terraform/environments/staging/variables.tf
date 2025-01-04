# Staging environment identifier
variable "environment" {
  type        = string
  description = "Deployment environment identifier, strictly enforced as 'staging'"
  default     = "staging"
  
  validation {
    condition     = var.environment == "staging"
    error_message = "Environment must be 'staging' for this configuration"
  }
}

# AWS region for staging deployment
variable "region" {
  type        = string
  description = "AWS region for staging deployment"
  default     = "us-east-1"
  
  validation {
    condition     = contains(["us-east-1", "us-west-2"], var.region)
    error_message = "Region must be either us-east-1 or us-west-2 for staging"
  }
}

# Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for staging VPC network"
  default     = "10.1.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# Availability zone configuration
variable "az_count" {
  type        = number
  description = "Number of availability zones for staging (single-AZ setup)"
  default     = 1
  
  validation {
    condition     = var.az_count == 1
    error_message = "Staging environment must use single AZ configuration"
  }
}

# Instance type configurations
variable "instance_types" {
  type        = map(string)
  description = "Instance types for various staging services"
  default = {
    frontend = "t3.small"
    backend  = "t3.medium"
    worker   = "t3.small"
  }
}

# Database configuration
variable "database_config" {
  type        = map(string)
  description = "RDS configuration for staging database"
  default = {
    instance_class        = "db.t3.medium"
    allocated_storage    = "20"
    max_allocated_storage = "50"
  }
}

# Redis configuration
variable "redis_config" {
  type        = map(string)
  description = "ElastiCache configuration for staging Redis"
  default = {
    node_type       = "cache.t3.micro"
    num_cache_nodes = "1"
  }
}

# Maintenance window configuration
variable "maintenance_window" {
  type        = map(string)
  description = "Maintenance window configuration for staging"
  default = {
    day        = "sun"
    start_time = "03:00"
    duration   = "2"
  }
}

# Monitoring thresholds
variable "monitoring_config" {
  type        = map(any)
  description = "Monitoring thresholds for staging environment"
  default = {
    cpu_threshold           = "70"
    memory_threshold        = "75"
    disk_threshold         = "80"
    alert_evaluation_periods = "2"
  }
}

# Feature flags
variable "feature_flags" {
  type        = map(bool)
  description = "Feature flags for staging environment"
  default = {
    enable_auto_shutdown = true
    enable_backup       = true
    enable_monitoring   = true
    enable_test_data    = true
  }
}