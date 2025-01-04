# VPC outputs
output "vpc_id" {
  description = "The ID of the VPC created for the environment"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC for network planning and security group rules"
  value       = aws_vpc.main.cidr_block
}

output "vpc_dns_hostnames_enabled" {
  description = "Flag indicating if DNS hostnames are enabled in the VPC"
  value       = aws_vpc.main.enable_dns_hostnames
}

# Subnet outputs
output "public_subnet_ids" {
  description = "List of public subnet IDs across availability zones for load balancer and public resource deployment"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs across availability zones for secure application and database deployment"
  value       = aws_subnet.private[*].id
}

output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks for network planning"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks for network planning"
  value       = aws_subnet.private[*].cidr_block
}

output "availability_zones" {
  description = "List of availability zones where subnets are deployed"
  value       = aws_subnet.public[*].availability_zone
}

# NAT Gateway outputs
output "nat_gateway_ips" {
  description = "List of Elastic IP addresses associated with NAT Gateways"
  value       = var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
}

# Route table outputs
output "public_route_table_id" {
  description = "ID of the public route table for custom route management"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of private route table IDs for custom route management"
  value       = var.enable_nat_gateway ? aws_route_table.private[*].id : []
}

# VPC Flow Logs output
output "flow_log_group_name" {
  description = "Name of the CloudWatch Log Group for VPC Flow Logs"
  value       = aws_cloudwatch_log_group.flow_log.name
}

# Network metadata
output "network_metadata" {
  description = "Combined network metadata for infrastructure documentation"
  value = {
    project_name = var.project
    environment  = var.environment
    vpc_id      = aws_vpc.main.id
    vpc_cidr    = aws_vpc.main.cidr_block
    az_count    = var.az_count
    nat_enabled = var.enable_nat_gateway
  }
}