# Configure Terraform settings and required providers
terraform {
  # Specify minimum Terraform version for stability and feature support
  required_version = ">= 1.0.0"

  # Define required providers with version constraints
  required_providers {
    aws = {
      source  = "hashicorp/aws"  # AWS provider source
      version = "~> 5.0"         # Major version 5.x for stability and security patches
    }
  }

  # Backend configuration should be specified in a separate backend.tf file
  # or passed via command line for environment-specific configuration
}

# Configure the AWS Provider with secure defaults and comprehensive resource tagging
provider "aws" {
  # Use the region specified in variables
  region = var.region

  # Default tags applied to all resources for consistent resource management
  default_tags {
    tags = {
      Project       = "digital-presence-mvp"
      ManagedBy    = "terraform"
      Environment  = var.environment
      Service      = "restaurant-platform"
      CreatedBy    = "terraform"
      CreatedAt    = timestamp()
      SecurityLevel = "high"
      BackupPolicy = "daily"
      CostCenter   = "digital-presence"
    }
  }

  # Security and compliance configurations
  assume_role {
    # Role ARN should be provided via variables for different environments
    role_arn = var.terraform_role_arn
  }

  # Explicit account allowlist for security
  allowed_account_ids = var.allowed_account_ids

  # Default retry configuration for API call resilience
  retry_mode = "standard"
  max_retries = 3

  # Enable EC2 Instance Metadata Service Version 2 (IMDSv2) for enhanced security
  defaults {
    instance_metadata_tags = "enabled"
  }
}

# Configure AWS provider alias for disaster recovery region if needed
provider "aws" {
  alias  = "dr"
  region = "us-west-2"  # Secondary region for disaster recovery

  # Inherit default tags from primary provider
  default_tags {
    tags = {
      Project       = "digital-presence-mvp"
      ManagedBy    = "terraform"
      Environment  = var.environment
      Service      = "restaurant-platform"
      CreatedBy    = "terraform"
      CreatedAt    = timestamp()
      SecurityLevel = "high"
      BackupPolicy = "daily"
      CostCenter   = "digital-presence"
      Region       = "dr"
    }
  }

  # Use the same role and security configurations as primary provider
  assume_role {
    role_arn = var.terraform_role_arn
  }
  allowed_account_ids = var.allowed_account_ids
}