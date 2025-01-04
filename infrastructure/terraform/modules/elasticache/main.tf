# AWS ElastiCache Redis Module
# Provider version: ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Redis Parameter Group with optimized settings
resource "aws_elasticache_parameter_group" "redis_params" {
  family = "redis7.0"
  name   = "${var.redis_cluster_id}-params"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.redis_cluster_id}-params"
    }
  )
}

# Subnet group for Redis cluster deployment
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "${var.redis_cluster_id}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Redis cluster ${var.redis_cluster_id}"

  tags = merge(
    var.tags,
    {
      Name = "${var.redis_cluster_id}-subnet-group"
    }
  )
}

# Security group for Redis cluster access
resource "aws_security_group" "redis_sg" {
  name        = "${var.redis_cluster_id}-sg"
  description = "Security group for Redis cluster ${var.redis_cluster_id}"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = var.security_group_ids
    description     = "Redis access from application security groups"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.redis_cluster_id}-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Redis cluster with enhanced security and high availability
resource "aws_elasticache_cluster" "redis_cluster" {
  cluster_id           = var.redis_cluster_id
  engine              = "redis"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis_params.name
  port                = var.redis_port
  subnet_group_name   = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids  = [aws_security_group.redis_sg.id]

  # Enhanced features
  engine_version             = "7.0"
  maintenance_window         = var.maintenance_window
  snapshot_retention_limit   = var.backup_retention_period
  snapshot_window           = var.backup_window
  auto_minor_version_upgrade = true

  # Security features
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true

  # High availability features
  multi_az_enabled            = true
  automatic_failover_enabled  = var.enable_auto_failover

  # Notifications
  dynamic "notification_topic_arn" {
    for_each = var.notification_topic_arn != null ? [var.notification_topic_arn] : []
    content {
      topic_arn = notification_topic_arn.value
    }
  }

  # Apply changes
  apply_immediately = var.apply_immediately

  tags = merge(
    var.tags,
    {
      Name = var.redis_cluster_id
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.redis_cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = var.notification_topic_arn != null ? [var.notification_topic_arn] : []
  ok_actions         = var.notification_topic_arn != null ? [var.notification_topic_arn] : []

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis_cluster.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.redis_cluster_id}-cpu-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.redis_cluster_id}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = var.notification_topic_arn != null ? [var.notification_topic_arn] : []
  ok_actions         = var.notification_topic_arn != null ? [var.notification_topic_arn] : []

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis_cluster.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.redis_cluster_id}-memory-alarm"
    }
  )
}