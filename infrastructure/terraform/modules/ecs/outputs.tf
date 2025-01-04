# Output definitions for ECS cluster and services
# Terraform ~> 1.0

# ECS Cluster ID output
output "cluster_id" {
  description = "The ID of the ECS cluster for service and monitoring integration. Used by other modules to reference the cluster for service deployments and monitoring tool configurations."
  value       = aws_ecs_cluster.main.id
}

# ECS Cluster Name output
output "cluster_name" {
  description = "The name of the ECS cluster for service configurations and monitoring. Used for service discovery and CloudWatch log group associations."
  value       = aws_ecs_cluster.main.name
}

# ECS Service Names output
output "service_names" {
  description = "List of ECS service names deployed in the cluster for monitoring and management. Used by monitoring tools to track service health and performance."
  value       = [for service in aws_ecs_service.services : service.name]
}