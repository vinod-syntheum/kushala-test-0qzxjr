#!/bin/bash

# Database Backup Script for Restaurant Digital Presence Platform
# Version: 1.0.0
# Dependencies:
# - postgresql-client v15
# - mongodb-database-tools v100.7.0
# - awscli v2.0

set -euo pipefail

# Load environment variables if .env exists
if [ -f .env ]; then
    source .env
fi

# Global Configuration
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/restaurant-platform}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-restaurant-platform-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
LOG_DIR="${BACKUP_ROOT}/logs"
MANIFEST_FILE="${BACKUP_DIR}/manifest.json"

# Logging configuration
setup_logging() {
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_DIR}/backup_${TIMESTAMP}.log")
    exec 2>&1
}

# Function to check all prerequisites
check_prerequisites() {
    local status=0

    echo "Checking prerequisites..."

    # Check required environment variables
    for var in DATABASE_URL MONGODB_URI AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY BACKUP_ENCRYPTION_KEY; do
        if [ -z "${!var-}" ]; then
            echo "ERROR: Required environment variable $var is not set"
            status=1
        fi
    done

    # Check required tools
    for cmd in pg_dump mongodump aws openssl parallel gzip; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            echo "ERROR: Required command $cmd not found"
            status=1
        fi
    done

    # Verify PostgreSQL connection
    if ! PGPASSWORD="${DATABASE_URL#*:*@}" psql "${DATABASE_URL}" -c '\q' >/dev/null 2>&1; then
        echo "ERROR: Cannot connect to PostgreSQL database"
        status=1
    fi

    # Verify MongoDB connection
    if ! mongosh "${MONGODB_URI}" --eval "db.stats()" >/dev/null 2>&1; then
        echo "ERROR: Cannot connect to MongoDB database"
        status=1
    fi

    # Check AWS S3 access
    if ! aws s3 ls "s3://${S3_BUCKET}" >/dev/null 2>&1; then
        echo "ERROR: Cannot access S3 bucket ${S3_BUCKET}"
        status=1
    fi

    # Check backup directory
    mkdir -p "${BACKUP_DIR}"
    if [ ! -w "${BACKUP_DIR}" ]; then
        echo "ERROR: Cannot write to backup directory ${BACKUP_DIR}"
        status=1
    fi

    return $status
}

# Function to backup PostgreSQL database
backup_postgres() {
    local backup_type="$1"
    local pg_backup_file="${BACKUP_DIR}/postgres_${backup_type}.dump"
    local status=0

    echo "Starting PostgreSQL ${backup_type} backup..."

    # Parse DATABASE_URL for connection parameters
    local db_name="${DATABASE_URL##*/}"
    db_name="${db_name%%\?*}"

    # Execute backup based on type
    if [ "$backup_type" = "full" ]; then
        if ! PGPASSWORD="${DATABASE_URL#*:*@}" pg_dump \
            --format=custom \
            --verbose \
            --compress=9 \
            --file="${pg_backup_file}" \
            "${DATABASE_URL}"; then
            echo "ERROR: PostgreSQL full backup failed"
            status=1
        fi
    else
        # Incremental backup using WAL archiving
        if ! PGPASSWORD="${DATABASE_URL#*:*@}" pg_dump \
            --format=custom \
            --verbose \
            --compress=9 \
            --file="${pg_backup_file}" \
            "${DATABASE_URL}"; then
            echo "ERROR: PostgreSQL incremental backup failed"
            status=1
        fi
    fi

    # Encrypt backup file
    if [ $status -eq 0 ]; then
        openssl enc -aes-256-gcm \
            -salt \
            -in "${pg_backup_file}" \
            -out "${pg_backup_file}.enc" \
            -k "${BACKUP_ENCRYPTION_KEY}" \
            -p || status=2

        # Generate checksum
        sha256sum "${pg_backup_file}.enc" > "${pg_backup_file}.enc.sha256"
    fi

    return $status
}

# Function to backup MongoDB database
backup_mongodb() {
    local backup_type="$1"
    local mongo_backup_dir="${BACKUP_DIR}/mongodb_${backup_type}"
    local status=0

    echo "Starting MongoDB ${backup_type} backup..."

    # Execute backup based on type
    if [ "$backup_type" = "full" ]; then
        if ! mongodump \
            --uri="${MONGODB_URI}" \
            --out="${mongo_backup_dir}" \
            --gzip; then
            echo "ERROR: MongoDB full backup failed"
            status=1
        fi
    else
        # Incremental backup using oplog
        if ! mongodump \
            --uri="${MONGODB_URI}" \
            --out="${mongo_backup_dir}" \
            --gzip \
            --oplog; then
            echo "ERROR: MongoDB incremental backup failed"
            status=1
        fi
    fi

    # Create tarball of backup directory
    if [ $status -eq 0 ]; then
        tar -czf "${mongo_backup_dir}.tar.gz" -C "${BACKUP_DIR}" "mongodb_${backup_type}"

        # Encrypt backup file
        openssl enc -aes-256-gcm \
            -salt \
            -in "${mongo_backup_dir}.tar.gz" \
            -out "${mongo_backup_dir}.tar.gz.enc" \
            -k "${BACKUP_ENCRYPTION_KEY}" \
            -p || status=2

        # Generate checksum
        sha256sum "${mongo_backup_dir}.tar.gz.enc" > "${mongo_backup_dir}.tar.gz.enc.sha256"
    fi

    return $status
}

# Function to upload backups to S3
upload_to_s3() {
    local status=0
    local s3_path="s3://${S3_BUCKET}/${TIMESTAMP}"

    echo "Uploading backups to S3..."

    # Create backup manifest
    cat > "${MANIFEST_FILE}" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "type": "${BACKUP_TYPE}",
    "files": {
        "postgres": "postgres_${BACKUP_TYPE}.dump.enc",
        "mongodb": "mongodb_${BACKUP_TYPE}.tar.gz.enc"
    },
    "checksums": {
        "postgres": "$(cat "${BACKUP_DIR}/postgres_${BACKUP_TYPE}.dump.enc.sha256")",
        "mongodb": "$(cat "${BACKUP_DIR}/mongodb_${BACKUP_TYPE}.tar.gz.enc.sha256")"
    }
}
EOF

    # Upload encrypted files and manifests
    for file in "${BACKUP_DIR}"/*.enc "${BACKUP_DIR}"/*.sha256 "${MANIFEST_FILE}"; do
        if ! aws s3 cp "${file}" "${s3_path}/$(basename "${file}")" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=${TIMESTAMP},backup_type=${BACKUP_TYPE}"; then
            echo "ERROR: Failed to upload $(basename "${file}")"
            status=1
        fi
    done

    return $status
}

# Function to clean up old backups
cleanup_old_backups() {
    local status=0
    local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

    echo "Cleaning up old backups..."

    # List all backups in S3
    aws s3 ls "s3://${S3_BUCKET}/" | while read -r line; do
        local backup_date=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
        if [[ "${backup_date}" < "${cutoff_date}" ]]; then
            # Move to Glacier before deletion
            aws s3 mv \
                "s3://${S3_BUCKET}/${backup_date}" \
                "s3://${S3_BUCKET}-archive/${backup_date}" \
                --recursive \
                --storage-class GLACIER || status=1
        fi
    done

    # Clean up local backup directory
    find "${BACKUP_ROOT}" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

    return $status
}

# Main execution
main() {
    local status=0

    # Setup logging
    setup_logging

    echo "Starting backup process at $(date)"

    # Check prerequisites
    if ! check_prerequisites; then
        echo "ERROR: Prerequisites check failed"
        exit 1
    fi

    # Determine backup type based on day of week
    if [ "$(date +%u)" -eq 7 ]; then
        BACKUP_TYPE="full"
    else
        BACKUP_TYPE="incremental"
    fi

    # Execute backups
    backup_postgres "${BACKUP_TYPE}" || status=$?
    backup_mongodb "${BACKUP_TYPE}" || status=$?

    # Upload to S3 if backups were successful
    if [ $status -eq 0 ]; then
        upload_to_s3 || status=$?
    fi

    # Cleanup old backups
    cleanup_old_backups || status=$?

    echo "Backup process completed at $(date) with status ${status}"
    return $status
}

# Execute main function
main "$@"