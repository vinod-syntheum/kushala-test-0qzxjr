variable "project" {
  type        = string
  description = "Project name for resource tagging and identification"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  type        = string
  description = "Environment name (staging/production) for resource tagging"
  
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }

  validation {
    condition     = tonumber(split("/", var.vpc_cidr)[1]) <= 16
    error_message = "VPC CIDR block must be /16 or larger to accommodate multiple subnets."
  }
}

variable "az_count" {
  type        = number
  description = "Number of availability zones to use for high availability"
  default     = 3
  
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "Number of AZs must be between 2 and 3 for proper high availability."
  }
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Flag to enable/disable NAT gateway creation for private subnets"
  default     = true
}