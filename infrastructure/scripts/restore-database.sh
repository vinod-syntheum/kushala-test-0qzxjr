#!/usr/bin/env bash

# Database Restoration Script for Restaurant Platform
# Version: 1.0.0
# Dependencies:
# - postgresql-client v15
# - mongodb-database-tools v100.7.0
# - awscli v2.0
# - openssl v3.0

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
RESTORE_ROOT="/var/restore/restaurant-platform"
S3_BUCKET="restaurant-platform-backups"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
LOG_DIR="/var/log/restaurant-platform/restore"
AUDIT_FILE="${LOG_DIR}/restore_audit.log"

# Logging Functions
log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $*" | tee -a "${AUDIT_FILE}"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2 | tee -a "${AUDIT_FILE}"
}

log_audit() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [AUDIT] $*" >> "${AUDIT_FILE}"
}

# Check Prerequisites and Initialize
check_prerequisites() {
    local status=0

    # Create log directory with secure permissions
    mkdir -p "${LOG_DIR}"
    chmod 700 "${LOG_DIR}"

    # Verify required tools
    for cmd in pg_restore mongorestore aws openssl; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            log_error "Required command not found: ${cmd}"
            status=1
        fi
    done

    # Verify PostgreSQL version compatibility
    if ! pg_restore --version | grep -q "pg_restore (PostgreSQL) 15"; then
        log_error "Incompatible pg_restore version. Required: PostgreSQL 15"
        status=1
    fi

    # Verify MongoDB tools version
    if ! mongorestore --version | grep -q "100.7"; then
        log_error "Incompatible mongorestore version. Required: 100.7.0"
        status=1
    fi

    # Verify AWS CLI configuration
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS CLI not configured properly"
        status=1
    }

    # Verify environment variables
    if [[ -z "${DATABASE_URL:-}" ]] || [[ -z "${MONGODB_URI:-}" ]]; then
        log_error "Required environment variables not set: DATABASE_URL or MONGODB_URI"
        status=1
    }

    # Verify encryption key
    if [[ -z "${ENCRYPTION_KEY:-}" ]]; then
        log_error "Backup encryption key not set"
        status=1
    }

    # Check restore directory
    mkdir -p "${RESTORE_ROOT}"
    chmod 700 "${RESTORE_ROOT}"

    return ${status}
}

# Download and verify backup from S3
download_from_s3() {
    local backup_id="$1"
    local restore_path="$2"
    local status=0

    log_info "Starting backup download: ${backup_id}"
    log_audit "Initiated backup download: ${backup_id}"

    # Download backup metadata
    if ! aws s3 cp "s3://${S3_BUCKET}/${backup_id}/metadata.json" "${restore_path}/metadata.json"; then
        log_error "Failed to download backup metadata"
        return 1
    fi

    # Verify backup integrity from metadata
    local expected_files
    expected_files=$(jq -r '.files[]' "${restore_path}/metadata.json")
    
    # Download and verify each backup file
    while IFS= read -r file; do
        log_info "Downloading: ${file}"
        
        # Download encrypted backup file
        if ! aws s3 cp "s3://${S3_BUCKET}/${backup_id}/${file}" "${restore_path}/${file}"; then
            log_error "Failed to download: ${file}"
            status=1
            continue
        }

        # Verify checksum
        local expected_checksum
        expected_checksum=$(jq -r ".checksums[\"${file}\"]" "${restore_path}/metadata.json")
        local actual_checksum
        actual_checksum=$(sha256sum "${restore_path}/${file}" | cut -d' ' -f1)

        if [[ "${expected_checksum}" != "${actual_checksum}" ]]; then
            log_error "Checksum verification failed for: ${file}"
            status=1
        }
    done <<< "${expected_files}"

    log_audit "Completed backup download with status: ${status}"
    return ${status}
}

# Restore PostgreSQL database
restore_postgres() {
    local restore_path="$1"
    local status=0

    log_info "Starting PostgreSQL restoration"
    log_audit "Initiated PostgreSQL restore"

    # Create temporary directory for decrypted files
    local temp_dir
    temp_dir=$(mktemp -d "${restore_path}/postgres.XXXXXX")
    chmod 700 "${temp_dir}"

    # Decrypt backup
    openssl enc -d -aes-256-gcm -pbkdf2 \
        -in "${restore_path}/postgres.backup.enc" \
        -out "${temp_dir}/postgres.backup" \
        -k "${ENCRYPTION_KEY}"

    # Parse DATABASE_URL for connection parameters
    local db_host db_port db_name db_user db_password
    db_host=$(echo "${DATABASE_URL}" | sed -n 's/.*@\([^:]*\).*/\1/p')
    db_port=$(echo "${DATABASE_URL}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    db_name=$(echo "${DATABASE_URL}" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    db_user=$(echo "${DATABASE_URL}" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    db_password=$(echo "${DATABASE_URL}" | sed -n 's/.*:\([^@]*\)@.*/\1/p')

    # Export password for pg_restore
    export PGPASSWORD="${db_password}"

    # Perform restore with progress monitoring
    if ! pg_restore \
        --host="${db_host}" \
        --port="${db_port}" \
        --username="${db_user}" \
        --dbname="${db_name}" \
        --verbose \
        --no-owner \
        --no-privileges \
        --jobs=4 \
        "${temp_dir}/postgres.backup" 2>> "${LOG_DIR}/postgres_restore.log"; then
        log_error "PostgreSQL restore failed"
        status=1
    fi

    # Verify restoration
    if psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM information_schema.tables;" >/dev/null 2>&1; then
        log_info "PostgreSQL restore verification successful"
    else
        log_error "PostgreSQL restore verification failed"
        status=1
    fi

    # Cleanup
    rm -rf "${temp_dir}"
    unset PGPASSWORD

    log_audit "Completed PostgreSQL restore with status: ${status}"
    return ${status}
}

# Restore MongoDB database
restore_mongodb() {
    local restore_path="$1"
    local status=0

    log_info "Starting MongoDB restoration"
    log_audit "Initiated MongoDB restore"

    # Create temporary directory for decrypted files
    local temp_dir
    temp_dir=$(mktemp -d "${restore_path}/mongo.XXXXXX")
    chmod 700 "${temp_dir}"

    # Decrypt backup
    openssl enc -d -aes-256-gcm -pbkdf2 \
        -in "${restore_path}/mongo.archive.enc" \
        -out "${temp_dir}/mongo.archive" \
        -k "${ENCRYPTION_KEY}"

    # Perform restore with progress monitoring
    if ! mongorestore \
        --uri="${MONGODB_URI}" \
        --archive="${temp_dir}/mongo.archive" \
        --gzip \
        --preserveUUID \
        --numParallelCollections=4 \
        --writeConcern="majority" 2>> "${LOG_DIR}/mongo_restore.log"; then
        log_error "MongoDB restore failed"
        status=1
    fi

    # Verify restoration
    if mongosh "${MONGODB_URI}" --eval "db.adminCommand('listDatabases')" >/dev/null 2>&1; then
        log_info "MongoDB restore verification successful"
    else
        log_error "MongoDB restore verification failed"
        status=1
    fi

    # Cleanup
    rm -rf "${temp_dir}"

    log_audit "Completed MongoDB restore with status: ${status}"
    return ${status}
}

# Cleanup restoration artifacts
cleanup_restore() {
    local restore_path="$1"
    local status=0

    log_info "Starting cleanup"
    log_audit "Initiated cleanup"

    # Secure deletion of temporary files
    find "${restore_path}" -type f -exec shred -u {} \;
    
    # Remove restore directory
    rm -rf "${restore_path}"

    # Archive logs older than 30 days
    find "${LOG_DIR}" -type f -name "*.log" -mtime +30 -exec gzip {} \;

    log_audit "Completed cleanup with status: ${status}"
    return ${status}
}

# Main execution
main() {
    local backup_id="$1"
    local status=0

    # Initialize logging
    exec 1> >(tee -a "${LOG_DIR}/restore.log")
    exec 2> >(tee -a "${LOG_DIR}/restore.error.log" >&2)

    log_info "Starting database restoration process for backup: ${backup_id}"
    log_audit "Restoration process initiated for backup: ${backup_id}"

    # Create restore directory
    local restore_path="${RESTORE_ROOT}/${backup_id}"
    mkdir -p "${restore_path}"
    chmod 700 "${restore_path}"

    # Execute restoration process
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        status=1
    elif ! download_from_s3 "${backup_id}" "${restore_path}"; then
        log_error "Backup download failed"
        status=1
    elif ! restore_postgres "${restore_path}"; then
        log_error "PostgreSQL restoration failed"
        status=1
    elif ! restore_mongodb "${restore_path}"; then
        log_error "MongoDB restoration failed"
        status=1
    fi

    # Always attempt cleanup
    cleanup_restore "${restore_path}"

    log_info "Database restoration process completed with status: ${status}"
    log_audit "Restoration process completed with status: ${status}"

    return ${status}
}

# Script entry point
if [[ "${#}" -ne 1 ]]; then
    echo "Usage: $0 <backup_id>"
    exit 1
fi

main "$1"