# Backend configuration for Terraform state management
# Version: Terraform >= 1.0
# Provider: AWS >= 4.0

terraform {
  backend "s3" {
    # S3 bucket for centralized state storage with versioning
    bucket = "digital-presence-mvp-terraform-state"
    
    # State file path within bucket
    key = "terraform.tfstate"
    
    # Primary deployment region for state storage
    region = "us-east-1"
    
    # Enable state file encryption using AWS KMS
    encrypt = true
    
    # DynamoDB table for state locking
    dynamodb_table = "digital-presence-mvp-terraform-locks"
    
    # Environment-based workspace isolation
    workspace_key_prefix = "${var.environment}"
    
    # Enable versioning for state file history
    versioning = true
    
    # Server-side encryption configuration using AWS KMS
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm     = "aws:kms"
          kms_master_key_id = "aws/s3"
        }
      }
    }
    
    # Lifecycle rules for state file management
    lifecycle_rule {
      enabled = true
      
      noncurrent_version_expiration {
        days = 90
      }
    }
    
    # Additional security configurations
    acl           = "private"
    force_destroy = false
    
    # Enable object locking for compliance
    object_lock_configuration {
      object_lock_enabled = "Enabled"
    }
  }
  
  # Required provider configuration
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  
  # Minimum Terraform version requirement
  required_version = ">= 1.0"
}