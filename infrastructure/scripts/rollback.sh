#!/bin/bash

# Rollback Script for Digital Presence MVP
# Version: 1.0
# Dependencies:
# - aws-cli v2.x
# - kubectl v1.x
# - jq v1.6

# Source health check functions
source "$(dirname "$0")/healthcheck.sh"

# Constants
readonly SCRIPT_VERSION="1.0"
readonly LOG_FILE="/var/log/rollback.log"
readonly LOCK_FILE="/var/run/rollback.lock"
readonly METRICS_FILE="/var/log/rollback_metrics.json"
readonly MAX_ROLLBACK_TIME=1800  # 30 minutes
readonly CANARY_WAIT_TIME=300    # 5 minutes
readonly HEALTH_CHECK_RETRIES=5
readonly ROLLBACK_SUCCESS=0
readonly ROLLBACK_FAILURE=1

# Load environment variables with defaults
AWS_REGION=${AWS_REGION:-"us-east-1"}
SECONDARY_REGIONS=${SECONDARY_REGIONS:-""}
CLUSTER_NAME=${CLUSTER_NAME:-"production-cluster"}
DEPLOYMENT_ENVIRONMENT=${DEPLOYMENT_ENVIRONMENT:-"production"}
ROLLBACK_TIMEOUT=${ROLLBACK_TIMEOUT:-1800}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
CANARY_PERCENTAGE=${CANARY_PERCENTAGE:-10}

# Logging function with structured JSON output
log_rollback() {
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

# Check prerequisites for rollback operation
check_prerequisites() {
    log_rollback "INFO" "Checking prerequisites" "{}"
    
    # Check required tools
    for cmd in aws kubectl jq; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_rollback "ERROR" "Required tool not found: $cmd" "{}"
            return $ROLLBACK_FAILURE
        fi
    done
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_rollback "ERROR" "Invalid AWS credentials" "{}"
        return $ROLLBACK_FAILURE
    fi
    
    # Check cluster access
    if ! kubectl get nodes >/dev/null 2>&1; then
        log_rollback "ERROR" "Cannot access Kubernetes cluster" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Verify environment variables
    local required_vars=(AWS_REGION CLUSTER_NAME DEPLOYMENT_ENVIRONMENT)
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_rollback "ERROR" "Required environment variable not set: $var" "{}"
            return $ROLLBACK_FAILURE
        fi
    done
    
    return $ROLLBACK_SUCCESS
}

# Get previous stable version
get_previous_version() {
    local service_name=$1
    local az_list=$2
    
    log_rollback "INFO" "Retrieving previous stable version" \
        "{\"service\": \"$service_name\", \"az_list\": \"$az_list\"}"
    
    # Get deployment history
    local deployment_history
    deployment_history=$(kubectl rollout history deployment/"$service_name" -o json)
    if [ $? -ne 0 ]; then
        log_rollback "ERROR" "Failed to get deployment history" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Get previous revision number
    local previous_revision
    previous_revision=$(echo "$deployment_history" | jq -r '.status.history[-2].revision')
    if [ -z "$previous_revision" ]; then
        log_rollback "ERROR" "No previous revision found" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Verify version exists in registry
    local image_tag
    image_tag=$(kubectl get deployment/"$service_name" \
        -o jsonpath="{.spec.template.spec.containers[0].image}" \
        --revision="$previous_revision")
    
    if ! aws ecr describe-images --repository-name "$service_name" \
        --image-ids imageTag="$image_tag" >/dev/null 2>&1; then
        log_rollback "ERROR" "Previous version image not found in registry" \
            "{\"image_tag\": \"$image_tag\"}"
        return $ROLLBACK_FAILURE
    }
    
    echo "$image_tag"
    return $ROLLBACK_SUCCESS
}

# Perform rollback with canary testing
perform_rollback() {
    local service_name=$1
    local target_version=$2
    local az_list=$3
    
    log_rollback "INFO" "Initiating rollback" \
        "{\"service\": \"$service_name\", \"target_version\": \"$target_version\"}"
    
    # Acquire lock
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        log_rollback "ERROR" "Another rollback is in progress" "{}"
        return $ROLLBACK_FAILURE
    fi
    trap 'rm -rf "$LOCK_FILE"' EXIT
    
    # Stop current deployment if in progress
    kubectl rollout stop deployment/"$service_name" 2>/dev/null
    
    # Start canary rollback
    local canary_replicas
    canary_replicas=$(kubectl get deployment/"$service_name" \
        -o jsonpath='{.spec.replicas}')
    canary_replicas=$((canary_replicas * CANARY_PERCENTAGE / 100))
    
    log_rollback "INFO" "Starting canary rollback" \
        "{\"canary_replicas\": $canary_replicas}"
    
    # Update canary instances
    if ! kubectl set image deployment/"$service_name" \
        "$service_name=$target_version" --replicas="$canary_replicas"; then
        log_rollback "ERROR" "Failed to update canary instances" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Wait for canary health
    sleep "$CANARY_WAIT_TIME"
    if ! verify_multi_az_health "$service_name" "$az_list"; then
        log_rollback "ERROR" "Canary instances failed health check" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Complete rollback for remaining instances
    log_rollback "INFO" "Completing full rollback" "{}"
    if ! kubectl rollout undo deployment/"$service_name"; then
        log_rollback "ERROR" "Failed to complete rollback" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Wait for rollback completion
    if ! kubectl rollout status deployment/"$service_name" --timeout="${ROLLBACK_TIMEOUT}s"; then
        log_rollback "ERROR" "Rollback did not complete within timeout" "{}"
        return $ROLLBACK_FAILURE
    }
    
    return $ROLLBACK_SUCCESS
}

# Verify rollback success
verify_rollback() {
    local service_name=$1
    local az_list=$2
    
    log_rollback "INFO" "Verifying rollback" \
        "{\"service\": \"$service_name\", \"az_list\": \"$az_list\"}"
    
    # Check deployment status
    local deployment_status
    deployment_status=$(kubectl get deployment/"$service_name" -o json)
    if [ $? -ne 0 ]; then
        log_rollback "ERROR" "Failed to get deployment status" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Verify replicas
    local ready_replicas
    ready_replicas=$(echo "$deployment_status" | jq -r '.status.readyReplicas')
    local desired_replicas
    desired_replicas=$(echo "$deployment_status" | jq -r '.status.replicas')
    
    if [ "$ready_replicas" != "$desired_replicas" ]; then
        log_rollback "ERROR" "Not all replicas are ready" \
            "{\"ready\": $ready_replicas, \"desired\": $desired_replicas}"
        return $ROLLBACK_FAILURE
    }
    
    # Verify health across services
    if ! check_backend_health && \
       ! check_database_health && \
       ! check_redis_health; then
        log_rollback "ERROR" "Service health checks failed" "{}"
        return $ROLLBACK_FAILURE
    }
    
    # Verify multi-AZ health
    if ! verify_multi_az_health "$service_name" "$az_list"; then
        log_rollback "ERROR" "Multi-AZ health check failed" "{}"
        return $ROLLBACK_FAILURE
    }
    
    log_rollback "INFO" "Rollback verification successful" "{}"
    return $ROLLBACK_SUCCESS
}

# Main execution
main() {
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <service_name> <az_list>"
        exit $ROLLBACK_FAILURE
    }
    
    local service_name=$1
    local az_list=$2
    
    # Initialize logging
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log_rollback "INFO" "Starting rollback operation" \
        "{\"script_version\": \"$SCRIPT_VERSION\", \"service\": \"$service_name\"}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_rollback "ERROR" "Prerequisites check failed" "{}"
        exit $ROLLBACK_FAILURE
    }
    
    # Get previous version
    local target_version
    target_version=$(get_previous_version "$service_name" "$az_list")
    if [ $? -ne 0 ]; then
        log_rollback "ERROR" "Failed to get previous version" "{}"
        exit $ROLLBACK_FAILURE
    }
    
    # Perform rollback
    if ! perform_rollback "$service_name" "$target_version" "$az_list"; then
        log_rollback "ERROR" "Rollback failed" "{}"
        exit $ROLLBACK_FAILURE
    }
    
    # Verify rollback
    if ! verify_rollback "$service_name" "$az_list"; then
        log_rollback "ERROR" "Rollback verification failed" "{}"
        exit $ROLLBACK_FAILURE
    }
    
    log_rollback "INFO" "Rollback completed successfully" \
        "{\"service\": \"$service_name\", \"version\": \"$target_version\"}"
    exit $ROLLBACK_SUCCESS
}

# Execute main function with provided arguments
main "$@"