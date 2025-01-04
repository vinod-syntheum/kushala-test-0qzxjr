# Core Terraform functionality for variable definitions and validation
terraform {
  # Version constraint specified in imports
  required_version = "~> 1.0"
}

# Project name variable for resource naming and tagging
variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming and tagging. Must be lowercase alphanumeric with hyphens only."

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

# Environment specification for deployment configuration
variable "environment" {
  type        = string
  description = "Deployment environment (development/staging/production). Used for environment-specific configurations and resource naming."

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# CloudFront price class selection for edge location distribution
variable "price_class" {
  type        = string
  description = <<-EOT
    CloudFront price class determining edge location distribution:
    - PriceClass_100: US, Canada, Europe
    - PriceClass_200: PriceClass_100 + South America, Africa, Asia
    - PriceClass_All: All edge locations (best performance, highest cost)
  EOT
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

# Custom domain configuration flag
variable "custom_domain" {
  type        = bool
  description = "Enable/disable custom domain configuration for CloudFront distribution. When enabled, requires valid ACM certificate and Route53 configuration."
  default     = false
}

# Origin configuration for S3 bucket
variable "origin_bucket" {
  type        = string
  description = "Name of the S3 bucket serving as the origin for CloudFront distribution."

  validation {
    condition     = length(var.origin_bucket) >= 3 && length(var.origin_bucket) <= 63
    error_message = "S3 bucket name must be between 3 and 63 characters long."
  }
}

# Cache behavior settings
variable "default_ttl" {
  type        = number
  description = "Default TTL for cached objects in seconds."
  default     = 3600 # 1 hour

  validation {
    condition     = var.default_ttl >= 0
    error_message = "Default TTL must be a non-negative number."
  }
}

# SSL/TLS certificate configuration
variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for custom domain. Required if custom_domain is true."
  default     = null

  validation {
    condition     = var.acm_certificate_arn == null || can(regex("^arn:aws:acm:", var.acm_certificate_arn))
    error_message = "ACM certificate ARN must be a valid AWS ACM certificate ARN or null."
  }
}

# Web Application Firewall (WAF) configuration
variable "web_acl_id" {
  type        = string
  description = "ID of AWS WAF web ACL to associate with the CloudFront distribution. Optional security feature."
  default     = null
}

# Geographic restrictions
variable "geo_restrictions" {
  type = object({
    restriction_type = string
    locations        = list(string)
  })
  description = "Geographic restriction configuration for the CloudFront distribution."
  default = {
    restriction_type = "none"
    locations        = []
  }

  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.geo_restrictions.restriction_type)
    error_message = "Restriction type must be one of: none, whitelist, blacklist."
  }
}

# Tags for resource management
variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to all created resources."
  default     = {}
}