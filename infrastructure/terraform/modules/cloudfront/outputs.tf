# CloudFront CDN Module Outputs - v1.0.0
# Exposes essential CloudFront distribution attributes for DNS configuration, 
# frontend integration, and Route53 alias records

output "distribution_id" {
  description = "The ID of the CloudFront distribution for DNS configuration and resource referencing"
  value       = aws_cloudfront_distribution.main.id
  
  # Ensure distribution exists before exposing output
  depends_on = [aws_cloudfront_distribution.main]
}

output "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution for frontend content delivery endpoint configuration"
  value       = aws_cloudfront_distribution.main.domain_name
  
  # Ensure distribution exists before exposing output
  depends_on = [aws_cloudfront_distribution.main]
}

output "hosted_zone_id" {
  description = "The Route53 hosted zone ID of the CloudFront distribution for DNS alias record configuration"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
  
  # Ensure distribution exists before exposing output
  depends_on = [aws_cloudfront_distribution.main]
}