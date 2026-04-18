#!/usr/bin/env bash
# retry.sh — General-purpose retry wrapper with exponential backoff
# Usage: ./retry.sh command [args...]
# Environment variables (optional):
#   RETRY_MAX=5          — max number of attempts (default: 3)
#   RETRY_MAX_SLEEP=30   — max sleep between retries in seconds (default: 30)
set -euo pipefail

# -----------------------------------------------------------------------
# SAFE to retry:
#   - Idempotent reads (HTTP GET, kubectl get)
#   - Health-check probes waiting for a service to come up
#   - Operations that are naturally idempotent (file downloads)
#
# DANGEROUS without thought:
#   - HTTP POST / payment operations (risk of double execution)
#   - Destructive operations (kubectl delete, terraform destroy)
#   - Already-overloaded services — retries amplify load
# -----------------------------------------------------------------------

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 command [args...]" >&2
  exit 1
fi

# -----------------------------------------------------------------------
# STEP 1: Configuration from environment (with defaults).
# Use: ${VARIABLE:-default}  to read an env var or fall back to a default.
# -----------------------------------------------------------------------

max_attempts="${RETRY_MAX:-3}"
max_sleep="${RETRY_MAX_SLEEP:-30}"
base_sleep=1

# -----------------------------------------------------------------------
# STEP 2: Add a log function with a timestamp.
# Every log line should be independently timestamped.
# Pattern: log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
# -----------------------------------------------------------------------

# TODO: define log() here

# -----------------------------------------------------------------------
# STEP 3: Implement the retry loop.
# Key points:
#   - Use while [[ $attempt -le $max_attempts ]]; do ... done
#   - Run the command with: if "$@"; then ...
#     (the "if" form is immune to set -e, so a failure won't abort the script)
#   - Capture the exit code immediately after failure: last_exit=$?
#   - On success, exit 0
#   - After the loop, exit "$last_exit" to preserve the real error code
#
# Core pattern:
#   attempt=1
#   last_exit=1
#   while [[ $attempt -le $max_attempts ]]; do
#       log "[attempt $attempt/$max_attempts] running: $*"
#       if "$@"; then
#           log "[attempt $attempt/$max_attempts] succeeded"
#           exit 0
#       fi
#       last_exit=$?
#       log "[attempt $attempt/$max_attempts] failed (exit $last_exit)"
#       # ... backoff ...
#       attempt=$(( attempt + 1 ))
#   done
#   log "all $max_attempts attempts failed"
#   exit "$last_exit"
# -----------------------------------------------------------------------

# -----------------------------------------------------------------------
# STEP 4: Add exponential backoff with a cap.
# Formula: sleep_time = base_sleep * (2 ^ (attempt - 1))
# Cap:     if sleep_time > max_sleep, use max_sleep instead
# In bash: sleep_time=$(( base_sleep * (2 ** (attempt - 1)) ))
# Only sleep if there are more attempts remaining (don't sleep after the last attempt).
# -----------------------------------------------------------------------

echo "TODO: implement retry wrapper for command: $*"
