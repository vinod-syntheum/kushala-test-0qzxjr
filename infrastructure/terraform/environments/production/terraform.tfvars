# Production environment identifier
environment = "production"

# Primary AWS region for production deployment
region = "us-east-1"

# Production VPC CIDR with sufficient address space
vpc_cidr = "10.0.0.0/16"

# Production-grade RDS instance using r6g series for memory-optimized performance
database_instance_class = "db.r6g.xlarge"

# Production Redis cache using r6g series for optimal caching
redis_node_type = "cache.r6g.large"

# Production ECS using c6g series for compute-optimized container workloads
ecs_instance_type = "c6g.large"

# High availability configuration
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
multi_az_enabled = true

# Enhanced backup and monitoring settings
backup_retention_days = 30
monitoring_interval = 60

# Auto-scaling configuration
min_capacity = 2
max_capacity = 10
target_cpu_utilization = 70
target_memory_utilization = 80

# Database configuration
db_allocated_storage = 100
db_max_allocated_storage = 1000
db_backup_window = "03:00-04:00"
db_maintenance_window = "Mon:04:00-Mon:05:00"
db_deletion_protection = true

# Redis configuration
redis_num_cache_nodes = 2
redis_automatic_failover_enabled = true
redis_maintenance_window = "tue:04:00-tue:05:00"
redis_snapshot_window = "03:00-04:00"
redis_snapshot_retention_limit = 7

# ECS configuration
ecs_min_capacity = 2
ecs_max_capacity = 8
ecs_desired_count = 2
ecs_health_check_grace_period = 300

# Load balancer configuration
lb_idle_timeout = 60
lb_deletion_protection = true
enable_cross_zone_load_balancing = true

# Security configuration
enable_vpc_flow_logs = true
enable_cloudtrail = true
enable_config = true
enable_guardduty = true

# Monitoring configuration
enable_enhanced_monitoring = true
monitoring_retention_days = 90
alarm_evaluation_periods = 2
alarm_datapoints_to_alarm = 2

# Backup configuration
enable_cross_region_backup = true
enable_auto_snapshot = true
snapshot_retention_days = 30

# DNS and routing configuration
route53_ttl = 60
enable_dns_hostnames = true
enable_dns_support = true

# Tags for resource management
default_tags = {
  Environment = "production"
  ManagedBy = "terraform"
  Project = "digital-presence-mvp"
  CostCenter = "production-infrastructure"
  BackupPolicy = "production"
  SecurityLevel = "high"
}