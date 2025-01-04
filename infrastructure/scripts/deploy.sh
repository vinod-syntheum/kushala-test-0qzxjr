#!/bin/bash

# Digital Presence MVP Deployment Script
# Version: 1.0
# Dependencies:
# - aws-cli v2.x
# - docker v24.x
# - kubectl v1.x
# - jq v1.6

# Source required scripts
source "$(dirname "$0")/healthcheck.sh"
source "$(dirname "$0")/rollback.sh"

# Constants
readonly SCRIPT_VERSION="1.0"
readonly LOG_FILE="/var/log/deployment.log"
readonly LOCK_FILE="/var/run/deployment.lock"
readonly METRICS_FILE="/var/log/deployment_metrics.json"
readonly DEPLOYMENT_SUCCESS=0
readonly DEPLOYMENT_FAILURE=1

# Environment variables with defaults
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
CLUSTER_NAME=${CLUSTER_NAME:-"production-cluster"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
DEPLOYMENT_ENVIRONMENT=${DEPLOYMENT_ENVIRONMENT:-"production"}
HEALTH_CHECK_THRESHOLD=${HEALTH_CHECK_THRESHOLD:-95}
DEPLOYMENT_TIMEOUT=${DEPLOYMENT_TIMEOUT:-1800}
CANARY_PERCENTAGE=${CANARY_PERCENTAGE:-10}

# Logging function with structured JSON output
log_deployment() {
    local severity=$1
    local message=$2
    local metadata=$3
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    local log_entry
    log_entry=$(jq -n \
        --arg ts "$timestamp" \
        --arg sev "$severity" \
        --arg msg "$message" \
        --argjson meta "$metadata" \
        '{timestamp: $ts, severity: $sev, message: $msg, metadata: $meta}')
    
    echo "$log_entry" >> "$LOG_FILE"
    
    # Critical errors to stderr
    if [ "$severity" = "ERROR" ]; then
        echo "$message" >&2
    fi
}

# Check deployment prerequisites
check_prerequisites() {
    local environment=$1
    log_deployment "INFO" "Checking deployment prerequisites" "{\"environment\": \"$environment\"}"
    
    # Check required tools
    for cmd in aws docker kubectl jq; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_deployment "ERROR" "Required tool not found: $cmd" "{}"
            return $DEPLOYMENT_FAILURE
        fi
    done
    
    # Verify AWS credentials and configuration
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_deployment "ERROR" "Invalid AWS credentials" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    # Check Docker daemon and registry access
    if ! docker info >/dev/null 2>&1; then
        log_deployment "ERROR" "Docker daemon not running" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    if ! docker login "$DOCKER_REGISTRY" >/dev/null 2>&1; then
        log_deployment "ERROR" "Failed to authenticate with Docker registry" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    # Verify cluster access
    if ! kubectl get nodes >/dev/null 2>&1; then
        log_deployment "ERROR" "Cannot access Kubernetes cluster" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    return $DEPLOYMENT_SUCCESS
}

# Build container images
build_images() {
    local version=$1
    local build_type=$2
    log_deployment "INFO" "Building container images" "{\"version\": \"$version\", \"type\": \"$build_type\"}"
    
    # Build backend image
    if ! docker build \
        --build-arg VERSION="$version" \
        --build-arg BUILD_TYPE="$build_type" \
        -t "$DOCKER_REGISTRY/backend:$version" \
        -f ../docker/backend.Dockerfile ../../; then
        log_deployment "ERROR" "Backend image build failed" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    # Build frontend image
    if ! docker build \
        --build-arg VERSION="$version" \
        --build-arg BUILD_TYPE="$build_type" \
        -t "$DOCKER_REGISTRY/frontend:$version" \
        -f ../docker/frontend.Dockerfile ../../; then
        log_deployment "ERROR" "Frontend image build failed" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    
    # Push images to registry
    for service in backend frontend; do
        if ! docker push "$DOCKER_REGISTRY/$service:$version"; then
            log_deployment "ERROR" "Failed to push $service image" "{}"
            return $DEPLOYMENT_FAILURE
        fi
    done
    
    return $DEPLOYMENT_SUCCESS
}

# Deploy services with canary testing
deploy_services() {
    local version=$1
    local environment=$2
    local deployment_strategy=$3
    
    log_deployment "INFO" "Starting deployment" \
        "{\"version\": \"$version\", \"environment\": \"$environment\", \"strategy\": \"$deployment_strategy\"}"
    
    # Acquire deployment lock
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        log_deployment "ERROR" "Another deployment is in progress" "{}"
        return $DEPLOYMENT_FAILURE
    fi
    trap 'rm -rf "$LOCK_FILE"' EXIT
    
    # Update Kubernetes deployments
    for service in backend frontend; do
        # Deploy canary instances
        if [ "$deployment_strategy" = "canary" ]; then
            local canary_replicas
            canary_replicas=$(kubectl get deployment/"$service" \
                -o jsonpath='{.spec.replicas}')
            canary_replicas=$((canary_replicas * CANARY_PERCENTAGE / 100))
            
            log_deployment "INFO" "Deploying canary instances" \
                "{\"service\": \"$service\", \"replicas\": $canary_replicas}"
            
            if ! kubectl set image deployment/"$service" \
                "$service=$DOCKER_REGISTRY/$service:$version" \
                --replicas="$canary_replicas"; then
                log_deployment "ERROR" "Canary deployment failed" "{}"
                return $DEPLOYMENT_FAILURE
            fi
            
            # Wait for canary health
            sleep 300
            if ! check_service_health "$service"; then
                log_deployment "ERROR" "Canary health check failed" "{}"
                perform_rollback "$service" "$(get_previous_version "$service")"
                return $DEPLOYMENT_FAILURE
            fi
        fi
        
        # Full deployment
        log_deployment "INFO" "Performing full deployment" "{\"service\": \"$service\"}"
        if ! kubectl set image deployment/"$service" \
            "$service=$DOCKER_REGISTRY/$service:$version"; then
            log_deployment "ERROR" "Deployment failed" "{}"
            return $DEPLOYMENT_FAILURE
        fi
        
        # Wait for rollout completion
        if ! kubectl rollout status deployment/"$service" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
            log_deployment "ERROR" "Deployment timeout" "{}"
            perform_rollback "$service" "$(get_previous_version "$service")"
            return $DEPLOYMENT_FAILURE
        fi
        
        # Verify cross-AZ health
        if ! verify_cross_az_health "$service"; then
            log_deployment "ERROR" "Cross-AZ health check failed" "{}"
            perform_rollback "$service" "$(get_previous_version "$service")"
            return $DEPLOYMENT_FAILURE
        fi
    done
    
    return $DEPLOYMENT_SUCCESS
}

# Main execution
main() {
    if [ $# -lt 3 ]; then
        echo "Usage: $0 <version> <environment> <deployment_strategy>"
        exit $DEPLOYMENT_FAILURE
    fi
    
    local version=$1
    local environment=$2
    local deployment_strategy=$3
    
    # Initialize logging
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log_deployment "INFO" "Starting deployment operation" \
        "{\"script_version\": \"$SCRIPT_VERSION\", \"deployment_version\": \"$version\"}"
    
    # Check prerequisites
    if ! check_prerequisites "$environment"; then
        log_deployment "ERROR" "Prerequisites check failed" "{}"
        exit $DEPLOYMENT_FAILURE
    fi
    
    # Build images
    if ! build_images "$version" "$environment"; then
        log_deployment "ERROR" "Image build failed" "{}"
        exit $DEPLOYMENT_FAILURE
    fi
    
    # Deploy services
    if ! deploy_services "$version" "$environment" "$deployment_strategy"; then
        log_deployment "ERROR" "Deployment failed" "{}"
        exit $DEPLOYMENT_FAILURE
    fi
    
    log_deployment "INFO" "Deployment completed successfully" \
        "{\"version\": \"$version\", \"environment\": \"$environment\"}"
    exit $DEPLOYMENT_SUCCESS
}

# Execute main function with provided arguments
main "$@"