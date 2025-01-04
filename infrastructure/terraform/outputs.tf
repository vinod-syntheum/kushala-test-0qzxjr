# Core infrastructure outputs with enhanced security and environment support
# Terraform ~> 1.0

# Environment information
output "environment" {
  description = "Current deployment environment identifier for configuration management"
  value       = terraform.workspace
  sensitive   = false
}

# VPC and networking outputs
output "vpc_details" {
  description = "Comprehensive VPC information for network planning and security configuration"
  value = {
    vpc_id              = module.networking.vpc_id
    vpc_cidr            = module.networking.vpc_cidr
    environment         = terraform.workspace
    dns_hostnames      = module.networking.vpc_dns_hostnames_enabled
    flow_logs_enabled  = true
    flow_logs_group    = module.networking.flow_log_group_name
  }
  sensitive = false
}

output "network_subnets" {
  description = "Network subnet configuration for application deployment and security zoning"
  value = {
    public_subnet_ids  = module.networking.public_subnet_ids
    private_subnet_ids = module.networking.private_subnet_ids
    public_cidrs      = module.networking.public_subnet_cidrs
    private_cidrs     = module.networking.private_subnet_cidrs
    availability_zones = module.networking.availability_zones
  }
  sensitive = false
}

# ECS cluster information
output "ecs_cluster_info" {
  description = "ECS cluster details for service deployment and container orchestration"
  value = {
    cluster_id         = module.ecs.cluster_id
    cluster_name       = module.ecs.cluster_name
    service_names      = module.ecs.service_names
    environment        = terraform.workspace
    services_count     = length(module.ecs.service_names)
  }
  sensitive = false
}

# Database connection information
output "database_connection" {
  description = "Secure database connection information for application configuration"
  value = {
    endpoint           = module.rds.db_instance_endpoint
    port              = module.rds.db_instance_port
    availability_zone = module.rds.db_instance_availability_zone
    multi_az         = module.rds.db_instance_multi_az
    backup_retention = module.rds.db_instance_backup_retention
  }
  # Endpoint is not marked sensitive as it's needed for application configuration
  # but does not contain credentials
  sensitive = false
}

# Security and monitoring information
output "security_configuration" {
  description = "Security-related configuration for infrastructure monitoring and compliance"
  value = {
    vpc_flow_logs_enabled = true
    db_monitoring_role    = module.rds.db_monitoring_role_arn
    db_parameter_group    = module.rds.db_parameter_group_id
    db_subnet_group      = module.rds.db_subnet_group_id
    environment          = terraform.workspace
  }
  sensitive = false
}

# Network metadata for infrastructure documentation
output "network_metadata" {
  description = "Combined network metadata for infrastructure documentation and monitoring"
  value = {
    project_name    = module.networking.network_metadata.project_name
    environment     = module.networking.network_metadata.environment
    vpc_id         = module.networking.network_metadata.vpc_id
    vpc_cidr       = module.networking.network_metadata.vpc_cidr
    az_count       = module.networking.network_metadata.az_count
    nat_enabled    = module.networking.network_metadata.nat_enabled
  }
  sensitive = false
}

# Resource identifiers for external integrations
output "resource_identifiers" {
  description = "Resource identifiers for external tool integration and monitoring"
  value = {
    db_instance_identifier = module.rds.db_instance_identifier
    db_instance_arn       = module.rds.db_instance_arn
    cluster_id            = module.ecs.cluster_id
    vpc_id               = module.networking.vpc_id
  }
  sensitive = false
}

# Security group information
output "security_groups" {
  description = "Security group IDs for network security configuration and monitoring"
  value = {
    database_sg_id = module.rds.db_security_group_id
    environment    = terraform.workspace
  }
  sensitive = false
}