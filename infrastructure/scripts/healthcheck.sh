#!/bin/bash

# Health Check Script for Digital Presence MVP
# Version: 1.0
# Dependencies:
# - curl (latest)
# - kubectl (latest)
# - jq (latest)

# Global Constants
BACKEND_HEALTH_ENDPOINT="/health"
FRONTEND_HEALTH_ENDPOINT="/api/health"
MAX_RETRIES=3
RETRY_INTERVAL=10
TIMEOUT_SECONDS=5
EXIT_SUCCESS=0
EXIT_FAILURE=1
EXIT_CONFIG_ERROR=2
LOG_FILE="/var/log/healthcheck.log"
CACHE_DURATION=300
TLS_VERIFY=true
CACHE_DIR="/tmp/healthcheck_cache"

# Ensure required tools are available
command -v curl >/dev/null 2>&1 || { echo "curl is required but not installed"; exit $EXIT_CONFIG_ERROR; }
command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit $EXIT_CONFIG_ERROR; }

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Logging function with ISO 8601 timestamps
log_health_status() {
    local service_name=$1
    local status=$2
    local message=$3
    local metrics=$4
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Format log entry
    local log_entry="{\"timestamp\":\"$timestamp\",\"service\":\"$service_name\",\"status\":\"$status\",\"message\":\"$message\",\"metrics\":$metrics}"
    
    # Write to log file with rotation check
    if [ -f "$LOG_FILE" ] && [ "$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE")" -gt 104857600 ]; then
        mv "$LOG_FILE" "$LOG_FILE.1"
    fi
    
    echo "$log_entry" >> "$LOG_FILE"
}

# Retry mechanism with exponential backoff and jitter
retry_with_backoff() {
    local retry=0
    local max_retries=$1
    local interval=$2
    local command=$3
    local jitter
    
    until [ $retry -ge $max_retries ]; do
        if eval "$command"; then
            return $EXIT_SUCCESS
        fi
        
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            jitter=$((RANDOM % 5))
            sleep_time=$((interval * 2 ** retry + jitter))
            log_health_status "retry_mechanism" "warning" "Retry $retry of $max_retries. Waiting ${sleep_time}s" "{}"
            sleep $sleep_time
        fi
    done
    
    return $EXIT_FAILURE
}

# Check if cached result is valid
check_cache() {
    local service_name=$1
    local cache_file="$CACHE_DIR/${service_name}_health.cache"
    
    if [ -f "$cache_file" ]; then
        local cache_time
        cache_time=$(stat -f%m "$cache_file" 2>/dev/null || stat -c%Y "$cache_file")
        local current_time
        current_time=$(date +%s)
        
        if [ $((current_time - cache_time)) -lt $CACHE_DURATION ]; then
            cat "$cache_file"
            return $EXIT_SUCCESS
        fi
    fi
    return $EXIT_FAILURE
}

# Docker environment health check
check_docker_health() {
    local service_name=$1
    local health_endpoint=$2
    local port=$3
    local tls_verify=${4:-$TLS_VERIFY}
    local curl_opts="--silent --max-time $TIMEOUT_SECONDS"
    
    # Check cache first
    if check_cache "$service_name"; then
        return $EXIT_SUCCESS
    fi
    
    # Configure TLS verification
    if [ "$tls_verify" = true ]; then
        curl_opts="$curl_opts --insecure"
    fi
    
    # Prepare health check command
    local check_command="curl $curl_opts http://localhost:$port$health_endpoint"
    
    # Execute health check with retry
    if retry_with_backoff $MAX_RETRIES $RETRY_INTERVAL "$check_command > /tmp/health_response"; then
        if jq -e . >/dev/null 2>&1 < /tmp/health_response; then
            local metrics
            metrics=$(jq -c '{status:"healthy",responseTime:.responseTime}' < /tmp/health_response)
            log_health_status "$service_name" "healthy" "Health check successful" "$metrics"
            echo "$metrics" > "$CACHE_DIR/${service_name}_health.cache"
            return $EXIT_SUCCESS
        else
            log_health_status "$service_name" "unhealthy" "Invalid JSON response" "{}"
            return $EXIT_FAILURE
        fi
    else
        log_health_status "$service_name" "unhealthy" "Health check failed after $MAX_RETRIES retries" "{}"
        return $EXIT_FAILURE
    fi
}

# Kubernetes environment health check
check_kubernetes_health() {
    local namespace=$1
    local service_name=$2
    local context=$3
    
    # Verify kubectl availability for Kubernetes checks
    command -v kubectl >/dev/null 2>&1 || { 
        log_health_status "kubernetes" "error" "kubectl not available" "{}"
        return $EXIT_CONFIG_ERROR
    }
    
    # Check cache first
    if check_cache "k8s_${service_name}"; then
        return $EXIT_SUCCESS
    }
    
    # Set kubectl context if provided
    if [ -n "$context" ]; then
        kubectl config use-context "$context" >/dev/null || {
            log_health_status "kubernetes" "error" "Failed to set context $context" "{}"
            return $EXIT_CONFIG_ERROR
        }
    fi
    
    # Check pod health
    local pod_status
    pod_status=$(kubectl get pods -n "$namespace" -l "app=$service_name" -o json)
    if [ $? -ne 0 ]; then
        log_health_status "kubernetes" "error" "Failed to get pod status for $service_name" "{}"
        return $EXIT_FAILURE
    fi
    
    # Parse pod status and create metrics
    local ready_pods
    local total_pods
    ready_pods=$(echo "$pod_status" | jq -r '[.items[] | select(.status.phase=="Running" and (.status.conditions[] | select(.type=="Ready")).status=="True")] | length')
    total_pods=$(echo "$pod_status" | jq -r '.items | length')
    
    local metrics
    metrics=$(jq -n \
        --arg ready "$ready_pods" \
        --arg total "$total_pods" \
        '{readyPods: $ready, totalPods: $total}')
    
    # Evaluate health status
    if [ "$ready_pods" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
        log_health_status "k8s_${service_name}" "healthy" "All pods ready" "$metrics"
        echo "$metrics" > "$CACHE_DIR/k8s_${service_name}_health.cache"
        return $EXIT_SUCCESS
    else
        log_health_status "k8s_${service_name}" "unhealthy" "Not all pods ready" "$metrics"
        return $EXIT_FAILURE
    fi
}

# Main execution
main() {
    local environment=$1
    local service=$2
    
    case $environment in
        "docker")
            case $service in
                "backend")
                    check_docker_health "backend" "$BACKEND_HEALTH_ENDPOINT" 3000
                    ;;
                "frontend")
                    check_docker_health "frontend" "$FRONTEND_HEALTH_ENDPOINT" 3001
                    ;;
                *)
                    echo "Unknown service: $service"
                    exit $EXIT_CONFIG_ERROR
                    ;;
            esac
            ;;
        "kubernetes")
            case $service in
                "backend")
                    check_kubernetes_health "default" "backend" ""
                    ;;
                "frontend")
                    check_kubernetes_health "default" "frontend" ""
                    ;;
                *)
                    echo "Unknown service: $service"
                    exit $EXIT_CONFIG_ERROR
                    ;;
            esac
            ;;
        *)
            echo "Unknown environment: $environment"
            exit $EXIT_CONFIG_ERROR
            ;;
    esac
}

# Script execution
if [ $# -lt 2 ]; then
    echo "Usage: $0 <environment> <service>"
    echo "Environment: docker|kubernetes"
    echo "Service: backend|frontend"
    exit $EXIT_CONFIG_ERROR
fi

main "$1" "$2"