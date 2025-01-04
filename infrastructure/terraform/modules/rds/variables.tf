variable "identifier" {
  type        = string
  description = "Unique identifier for the RDS instance"
  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.identifier))
    error_message = "Identifier must contain only lowercase alphanumeric characters and hyphens"
  }
}

variable "instance_class" {
  type        = string
  description = "RDS instance type for PostgreSQL database"
  default     = "db.t3.medium"
  validation {
    condition     = can(regex("^db\\.(t3|r5|r6)\\.(medium|large|xlarge|2xlarge)$", var.instance_class))
    error_message = "Instance class must be a valid RDS instance type (t3, r5, or r6 series)"
  }
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 20
  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 16384
    error_message = "Allocated storage must be between 20 and 16384 GB"
  }
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "15"
  validation {
    condition     = can(regex("^(14|15)(\\.\\d+)?$", var.engine_version))
    error_message = "Engine version must be either 14.x or 15.x"
  }
}

variable "database_name" {
  type        = string
  description = "Name of the initial database to create"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name)) && length(var.database_name) <= 63
    error_message = "Database name must start with a letter, contain only alphanumeric characters and underscores, and be 63 characters or less"
  }
}

variable "username" {
  type        = string
  description = "Master username for the database instance"
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.username)) && length(var.username) <= 16
    error_message = "Username must start with a letter, contain only alphanumeric characters and underscores, and be 16 characters or less"
  }
}

variable "password" {
  type        = string
  description = "Master password for the database instance"
  sensitive   = true
  validation {
    condition     = length(var.password) >= 16 && can(regex("[A-Z]", var.password)) && can(regex("[a-z]", var.password)) && can(regex("[0-9]", var.password)) && can(regex("[!@#$%^&*()_+=-]", var.password))
    error_message = "Password must be at least 16 characters and contain uppercase, lowercase, numbers, and special characters"
  }
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 7 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days"
  }
}

variable "backup_window" {
  type        = string
  description = "Daily time range during which automated backups are created"
  default     = "03:00-04:00"
  validation {
    condition     = can(regex("^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range during which system maintenance can occur"
  default     = "Mon:04:00-Mon:05:00"
  validation {
    condition     = can(regex("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-2][0-9]:[0-5][0-9]-(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in format ddd:HH:MM-ddd:HH:MM"
  }
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where RDS will be deployed"
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must start with 'vpc-'"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for the RDS subnet group"
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs are required for high availability"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (staging/production)"
  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either 'staging' or 'production'"
  }
}