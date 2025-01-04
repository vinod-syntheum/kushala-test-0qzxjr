# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Fetch available AZs in current region
data "aws_availability_zones" "available" {
  state = "available"
}

# Create VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project}-${var.environment}-vpc"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project}-${var.environment}-igw"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create public subnets
resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block             = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "${var.project}-${var.environment}-public-${count.index + 1}"
    Project                                        = var.project
    Environment                                    = var.environment
    ManagedBy                                      = "terraform"
    "kubernetes.io/role/elb"                       = "1"
    "kubernetes.io/cluster/${var.project}-cluster" = "shared"
  }
}

# Create private subnets
resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.az_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                           = "${var.project}-${var.environment}-private-${count.index + 1}"
    Project                                        = var.project
    Environment                                    = var.environment
    ManagedBy                                      = "terraform"
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/${var.project}-cluster" = "shared"
  }
}

# Create Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? var.az_count : 0
  domain = "vpc"

  tags = {
    Name        = "${var.project}-${var.environment}-nat-eip-${count.index + 1}"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# Create NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? var.az_count : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "${var.project}-${var.environment}-nat-${count.index + 1}"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# Create public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-public-rt"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create private route tables
resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? var.az_count : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-private-rt-${count.index + 1}"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count          = var.enable_nat_gateway ? var.az_count : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Enable VPC flow logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name        = "${var.project}-${var.environment}-flow-log"
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create CloudWatch log group for VPC flow logs
resource "aws_cloudwatch_log_group" "flow_log" {
  name              = "/aws/vpc/${var.project}-${var.environment}-flow-logs"
  retention_in_days = 30

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create IAM role for VPC flow logs
resource "aws_iam_role" "flow_log" {
  name = "${var.project}-${var.environment}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create IAM policy for VPC flow logs
resource "aws_iam_role_policy" "flow_log" {
  name = "${var.project}-${var.environment}-flow-log-policy"
  role = aws_iam_role.flow_log.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Output values
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "vpc_cidr_block" {
  value       = aws_vpc.main.cidr_block
  description = "VPC CIDR block"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "List of public subnet IDs"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of private subnet IDs"
}