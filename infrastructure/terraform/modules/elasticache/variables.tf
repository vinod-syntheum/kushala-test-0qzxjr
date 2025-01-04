variable "redis_cluster_id" {
  type        = string
  description = "Unique identifier for the Redis cluster"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.redis_cluster_id))
    error_message = "Cluster ID must contain only alphanumeric characters and hyphens"
  }
}

variable "redis_node_type" {
  type        = string
  description = "Instance type for Redis nodes (e.g., cache.t3.medium, cache.r6g.large)"
  default     = "cache.t3.medium"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z]+$", var.redis_node_type))
    error_message = "Node type must be a valid ElastiCache instance type"
  }
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the cluster (minimum 1 for single-node, 2 for multi-node)"
  default     = 2

  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 1 and 6"
  }
}

variable "redis_port" {
  type        = number
  description = "Port number for Redis connections"
  default     = 6379

  validation {
    condition     = var.redis_port > 0 && var.redis_port <= 65535
    error_message = "Port number must be between 1 and 65535"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Redis cluster deployment (minimum 2 subnets recommended for HA)"

  validation {
    condition     = length(var.subnet_ids) >= 1
    error_message = "At least one subnet ID must be provided"
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where Redis cluster will be deployed"
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance (ddd:hh24:mi-ddd:hh24:mi)"
  default     = "sun:05:00-sun:06:00"

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in the format ddd:hh24:mi-ddd:hh24:mi"
  }
}

variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days for which ElastiCache retains automatic snapshots"
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days"
  }
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family (e.g., redis6.x)"
  default     = "redis6.x"

  validation {
    condition     = can(regex("^redis[0-9]+\\.x$", var.parameter_group_family))
    error_message = "Parameter group family must be in the format redis<version>.x"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources"
  default     = {}
}

variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest"
  default     = true
}

variable "enable_auto_failover" {
  type        = bool
  description = "Enable automatic failover for multi-node clusters"
  default     = true
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs to associate with the Redis cluster"
  default     = []
}

variable "notification_topic_arn" {
  type        = string
  description = "ARN of SNS topic for Redis cluster notifications"
  default     = null
}

variable "apply_immediately" {
  type        = bool
  description = "Specifies whether modifications are applied immediately or during maintenance window"
  default     = false
}

variable "engine_version" {
  type        = string
  description = "Version number of the Redis engine"
  default     = "6.x"

  validation {
    condition     = can(regex("^[0-9]+\\.x$", var.engine_version))
    error_message = "Engine version must be in the format <major>.x"
  }
}