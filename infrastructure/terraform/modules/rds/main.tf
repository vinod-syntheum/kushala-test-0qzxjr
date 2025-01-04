# AWS Provider configuration for RDS module
# Provider version: ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Create DB subnet group for RDS networking
resource "aws_db_subnet_group" "main" {
  name        = "${var.identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.identifier} RDS instance"

  tags = {
    Name        = "${var.identifier}-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create security group for RDS instance
resource "aws_security_group" "rds" {
  name        = "${var.identifier}-sg"
  description = "Security group for ${var.identifier} RDS instance"
  vpc_id      = var.vpc_id

  # Ingress rule for PostgreSQL port
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = []  # To be populated by consuming module
    description     = "PostgreSQL access from application layer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.identifier}-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create RDS parameter group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  family = "postgres${split(".", var.engine_version)[0]}"
  name   = "${var.identifier}-pg"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  tags = {
    Name        = "${var.identifier}-pg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create RDS instance
resource "aws_db_instance" "main" {
  identifier = var.identifier
  
  # Engine configuration
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  
  # Database configuration
  db_name  = var.database_name
  username = var.username
  password = var.password
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az              = var.multi_az
  publicly_accessible   = false

  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  copy_tags_to_snapshot  = true

  # Performance and monitoring
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  monitoring_interval            = 60
  monitoring_role_arn           = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Additional configuration
  auto_minor_version_upgrade = true
  deletion_protection       = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot"
  parameter_group_name     = aws_db_parameter_group.main.name

  tags = {
    Name        = var.identifier
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password
    ]
  }
}

# Create IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.identifier}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.identifier}-monitoring-role"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach enhanced monitoring policy to IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}