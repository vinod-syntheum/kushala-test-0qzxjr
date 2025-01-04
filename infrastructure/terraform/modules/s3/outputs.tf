# Output definitions for S3 bucket module
# Exposes essential bucket attributes for integration with other services
# Version: 1.0.0

output "bucket_id" {
  description = "The unique identifier (name) of the S3 bucket for resource referencing"
  value       = aws_s3_bucket.media_bucket.id
  
  # Ensure bucket exists before exposing output
  depends_on = [aws_s3_bucket.media_bucket]
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket for IAM policy and resource configuration"
  value       = aws_s3_bucket.media_bucket.arn
  
  # Mark as sensitive since ARN contains account information
  sensitive = true
  
  # Ensure bucket exists before exposing output
  depends_on = [aws_s3_bucket.media_bucket]
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket for direct access configuration"
  value       = aws_s3_bucket.media_bucket.bucket_domain_name
  
  # Ensure bucket exists before exposing output
  depends_on = [aws_s3_bucket.media_bucket]
}

output "bucket_regional_domain_name" {
  description = "The regional domain name of the S3 bucket for CloudFront CDN origin configuration"
  value       = aws_s3_bucket.media_bucket.bucket_regional_domain_name
  
  # Ensure bucket exists before exposing output
  depends_on = [aws_s3_bucket.media_bucket]
}