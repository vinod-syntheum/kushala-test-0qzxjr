# AWS S3 Bucket Module - v1.0.0
# Configures secure, scalable media storage with comprehensive security controls

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Generate random suffix for globally unique bucket names
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Create S3 bucket with comprehensive security configurations
resource "aws_s3_bucket" "media_bucket" {
  bucket = "${var.bucket_prefix}-${var.environment}-${random_id.bucket_suffix.hex}"
  
  # Force destroy only in non-production environments
  force_destroy = var.environment != "prod"

  # Merge provided tags with required tags
  tags = merge(
    var.tags,
    {
      Name        = "${var.bucket_prefix}-${var.environment}"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Configure bucket versioning
resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.media_bucket.id
  
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
    # Enable MFA delete for production environment
    mfa_delete = var.environment == "prod" ? "Enabled" : "Disabled"
  }
}

# Configure public access blocking (enabled by default for security)
resource "aws_s3_bucket_public_access_block" "public_access_block" {
  bucket = aws_s3_bucket.media_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  count  = var.encryption_enabled ? 1 : 0
  bucket = aws_s3_bucket.media_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules if enabled
resource "aws_s3_bucket_lifecycle_configuration" "lifecycle_rules" {
  count  = var.lifecycle_rules_enabled ? 1 : 0
  bucket = aws_s3_bucket.media_bucket.id

  rule {
    id     = "media_lifecycle"
    status = "Enabled"

    # Transition to Standard-IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Keep only last 5 versions of each object
    noncurrent_version_expiration {
      noncurrent_days = 90
      newer_noncurrent_versions = 5
    }
  }
}

# Configure CORS if enabled
resource "aws_s3_bucket_cors_configuration" "cors" {
  count  = var.cors_enabled ? 1 : 0
  bucket = aws_s3_bucket.media_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Configure bucket logging if enabled
resource "aws_s3_bucket_logging" "logging" {
  count  = var.logging_enabled ? 1 : 0
  bucket = aws_s3_bucket.media_bucket.id

  target_bucket = aws_s3_bucket.media_bucket.id
  target_prefix = "access-logs/"
}

# Configure bucket policy for secure access
resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.media_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.media_bucket.arn,
          "${aws_s3_bucket.media_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Output values for use in other modules
output "bucket_id" {
  description = "The name of the bucket"
  value       = aws_s3_bucket.media_bucket.id
}

output "bucket_arn" {
  description = "The ARN of the bucket"
  value       = aws_s3_bucket.media_bucket.arn
}

output "bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.media_bucket.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.media_bucket.bucket_regional_domain_name
}

output "hosted_zone_id" {
  description = "The Route 53 Hosted Zone ID for the bucket's region"
  value       = aws_s3_bucket.media_bucket.hosted_zone_id
}