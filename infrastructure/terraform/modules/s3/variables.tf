terraform {
  # Terraform version constraint
  required_version = ">= 1.0.0"
}

variable "environment" {
  type        = string
  description = "Environment name for resource naming and tagging (e.g., dev, staging, prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "bucket_prefix" {
  type        = string
  description = "Prefix for S3 bucket naming - must be globally unique and DNS-compatible"
  default     = "restaurant-media"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_prefix))
    error_message = "Bucket prefix must be between 3 and 63 characters, contain only lowercase letters, numbers, and hyphens, and start/end with a letter or number."
  }
}

variable "versioning_enabled" {
  type        = bool
  description = "Enable versioning for the S3 bucket to protect against accidental deletions and modifications"
  default     = true
}

variable "lifecycle_rules_enabled" {
  type        = bool
  description = "Enable lifecycle rules for automatic transition of objects to different storage classes and expiration"
  default     = true
}

variable "cors_enabled" {
  type        = bool
  description = "Enable CORS configuration for the S3 bucket to control cross-origin resource sharing"
  default     = false
}

variable "allowed_origins" {
  type        = list(string)
  description = "List of allowed origins for CORS configuration when cors_enabled is true"
  default     = []
  
  validation {
    condition     = alltrue([for origin in var.allowed_origins : can(regex("^https?://[\\w-]+(\\.[\\w-]+)+(/.*)?$", origin))])
    error_message = "Each origin must be a valid URL starting with http:// or https://."
  }
}

variable "encryption_enabled" {
  type        = bool
  description = "Enable server-side encryption for the S3 bucket using AWS KMS"
  default     = true
}

variable "logging_enabled" {
  type        = bool
  description = "Enable access logging for the S3 bucket to track all requests"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for the S3 bucket and related resources"
  default     = {}
  
  validation {
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "ManagedBy")
    error_message = "Tags must include at minimum: Environment and ManagedBy."
  }
}