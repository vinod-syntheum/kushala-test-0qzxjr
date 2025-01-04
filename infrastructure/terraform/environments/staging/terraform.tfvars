# Environment Identification
environment = "staging"
region     = "us-east-1"

# Networking Configuration
vpc_cidr = "10.0.0.0/16"
az_count = 1

# Database Configuration
database_instance_class = "db.t3.medium"

# Cache Configuration
redis_node_type = "cache.t3.medium"

# ECS Configuration
ecs_instance_type      = "t3.medium"
ecs_min_instances      = 1
ecs_max_instances      = 2
ecs_desired_instances  = 1

# Resource Protection
enable_deletion_protection = false