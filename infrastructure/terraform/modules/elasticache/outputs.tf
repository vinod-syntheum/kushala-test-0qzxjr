# Redis cluster identifier output
output "redis_cluster_id" {
  description = "Unique identifier of the Redis cluster for reference in application configuration and monitoring"
  value       = aws_elasticache_cluster.redis_cluster.id
}

# Redis endpoint configuration
output "redis_endpoint" {
  description = "Configuration endpoint for the Redis cluster used for client connections and load balancing"
  value       = aws_elasticache_cluster.redis_cluster.configuration_endpoint
}

# Redis cache nodes details
output "redis_cache_nodes" {
  description = "List of cache nodes in the Redis cluster including their IDs, addresses, and ports for monitoring and failover"
  value       = aws_elasticache_cluster.redis_cluster.cache_nodes
}

# Redis security group identifier
output "redis_security_group_id" {
  description = "ID of the security group controlling network access to the Redis cluster"
  value       = aws_security_group.redis_sg.id
}

# Redis port number
output "redis_port" {
  description = "Port number on which the Redis cluster accepts connections"
  value       = aws_elasticache_cluster.redis_cluster.port
}

# Comprehensive Redis cluster outputs object
output "redis_cluster_outputs" {
  description = "Complete set of Redis cluster configuration details for application integration"
  value = {
    cluster_id       = aws_elasticache_cluster.redis_cluster.id
    endpoint         = aws_elasticache_cluster.redis_cluster.configuration_endpoint
    cache_nodes      = aws_elasticache_cluster.redis_cluster.cache_nodes
    security_group_id = aws_security_group.redis_sg.id
    port             = aws_elasticache_cluster.redis_cluster.port
  }
}