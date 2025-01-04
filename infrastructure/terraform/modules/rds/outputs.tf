# Database connection information
output "db_instance_endpoint" {
  description = "Connection endpoint for the RDS instance in the format of 'endpoint:port'"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "db_instance_address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
  sensitive   = false
}

output "db_instance_port" {
  description = "Port number on which the database accepts connections"
  value       = aws_db_instance.main.port
  sensitive   = false
}

# Resource identification
output "db_instance_identifier" {
  description = "Unique identifier of the RDS instance"
  value       = aws_db_instance.main.identifier
  sensitive   = false
}

output "db_instance_arn" {
  description = "Amazon Resource Name (ARN) of the RDS instance"
  value       = aws_db_instance.main.arn
  sensitive   = false
}

# High availability and backup configuration
output "db_instance_availability_zone" {
  description = "Availability zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
  sensitive   = false
}

output "db_instance_backup_retention" {
  description = "Number of days for which automated backups are retained"
  value       = aws_db_instance.main.backup_retention_period
  sensitive   = false
}

output "db_instance_multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = aws_db_instance.main.multi_az
  sensitive   = false
}

# Security group information
output "db_security_group_id" {
  description = "ID of the security group associated with the RDS instance"
  value       = aws_security_group.rds.id
  sensitive   = false
}

# Monitoring role information
output "db_monitoring_role_arn" {
  description = "ARN of the IAM role used for enhanced monitoring"
  value       = aws_iam_role.rds_monitoring.arn
  sensitive   = false
}

# Parameter group information
output "db_parameter_group_id" {
  description = "ID of the DB parameter group associated with the RDS instance"
  value       = aws_db_parameter_group.main.id
  sensitive   = false
}

# Subnet group information
output "db_subnet_group_id" {
  description = "ID of the DB subnet group associated with the RDS instance"
  value       = aws_db_subnet_group.main.id
  sensitive   = false
}