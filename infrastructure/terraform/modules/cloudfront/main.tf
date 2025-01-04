# CloudFront CDN Module - v1.0.0
# Implements secure, optimized content delivery with comprehensive logging and security controls

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and default configurations
locals {
  distribution_name = "${var.project_name}-${var.environment}-cdn"
  s3_origin_id     = "${var.project_name}-${var.environment}-origin"
  
  # Default cache policy settings
  default_cache_settings = {
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
    
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    
    compress = true
  }

  # Custom error responses configuration
  custom_error_responses = [
    {
      error_code            = 403
      response_code        = 404
      response_page_path   = "/404.html"
      error_caching_min_ttl = 10
    },
    {
      error_code            = 404
      response_code        = 404
      response_page_path   = "/404.html"
      error_caching_min_ttl = 10
    }
  ]

  # Security headers
  security_headers = {
    "Content-Security-Policy"   = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    "Strict-Transport-Security" = "max-age=31536000; includeSubDomains"
    "X-Content-Type-Options"    = "nosniff"
    "X-Frame-Options"           = "DENY"
    "X-XSS-Protection"          = "1; mode=block"
    "Referrer-Policy"           = "strict-origin-when-cross-origin"
  }
}

# Create Origin Access Identity for S3 bucket access
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${local.distribution_name}"
}

# Create CloudFront distribution with enhanced security and performance settings
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "CDN distribution for ${local.distribution_name}"
  default_root_object = "index.html"
  price_class        = var.price_class
  
  # Origin configuration
  origin {
    domain_name = var.bucket_domain_name
    origin_id   = local.s3_origin_id
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
    
    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify.result
    }
  }
  
  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = local.default_cache_settings.allowed_methods
    cached_methods   = local.default_cache_settings.cached_methods
    target_origin_id = local.s3_origin_id
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = local.default_cache_settings.min_ttl
    default_ttl            = local.default_cache_settings.default_ttl
    max_ttl                = local.default_cache_settings.max_ttl
    compress               = local.default_cache_settings.compress
    
    # Security headers
    response_headers_policy {
      dynamic "custom_headers_config" {
        for_each = local.security_headers
        content {
          header   = custom_headers_config.key
          value    = custom_headers_config.value
          override = true
        }
      }
    }
  }
  
  # Custom error responses
  dynamic "custom_error_response" {
    for_each = local.custom_error_responses
    content {
      error_code            = custom_error_response.value.error_code
      response_code        = custom_error_response.value.response_code
      response_page_path   = custom_error_response.value.response_page_path
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
    }
  }
  
  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restrictions.restriction_type
      locations        = var.geo_restrictions.locations
    }
  }
  
  # SSL/TLS configuration
  viewer_certificate {
    dynamic "acm_certificate_arn" {
      for_each = var.custom_domain ? [1] : []
      content {
        acm_certificate_arn      = var.ssl_certificate_arn
        minimum_protocol_version = "TLSv1.2_2021"
        ssl_support_method       = "sni-only"
      }
    }
    
    dynamic "cloudfront_default_certificate" {
      for_each = var.custom_domain ? [] : [1]
      content {
        cloudfront_default_certificate = true
      }
    }
  }
  
  # WAF integration
  dynamic "web_acl_id" {
    for_each = var.web_acl_id != null ? [1] : []
    content {
      web_acl_id = var.web_acl_id
    }
  }
  
  # Logging configuration
  logging_config {
    include_cookies = false
    bucket          = "${var.project_name}-${var.environment}-logs.s3.amazonaws.com"
    prefix          = "cloudfront/"
  }
  
  # Tags
  tags = merge(
    var.tags,
    {
      Name        = local.distribution_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Generate random password for origin verification
resource "random_password" "origin_verify" {
  length  = 32
  special = false
}

# S3 bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = var.bucket_id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${var.bucket_arn}/*"
      }
    ]
  })
}

# Outputs for integration with other modules
output "distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "origin_access_identity_path" {
  description = "The path of the Origin Access Identity"
  value       = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
}