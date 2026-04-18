#!/usr/bin/env bash
# health_check.sh — TCP reachability probe
# Usage: ./health_check.sh HOST PORT [HOST:PORT ...]
# Exit 0 if all targets are reachable, exit 1 if any are not.
set -euo pipefail

# -----------------------------------------------------------------------
# STEP 1: Argument handling is already done for single HOST PORT below.
# After the script works for one target, extend it to accept multiple
# targets in HOST:PORT format as additional arguments.
# -----------------------------------------------------------------------

host="${1:-}"
port="${2:-}"

if [[ -z "$host" || -z "$port" ]]; then
  echo "usage: $0 HOST PORT" >&2
  exit 1
fi

# -----------------------------------------------------------------------
# STEP 2: Validate that port is a number.
# Hint: use a regex match: [[ "$port" =~ ^[0-9]+$ ]]
# Send errors to stderr (>&2) so stdout stays clean.
# -----------------------------------------------------------------------

# TODO: add port number validation here

# -----------------------------------------------------------------------
# STEP 3: Add a log function that prepends an ISO-8601 timestamp.
# Pattern:
#   log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
# Then use log() instead of echo everywhere.
# -----------------------------------------------------------------------

# TODO: define log() here

# -----------------------------------------------------------------------
# STEP 4: Perform the TCP check.
# Pure-bash approach (no external tools needed):
#   timeout 3 bash -c "echo > /dev/tcp/${host}/${port}" 2>/dev/null
# Returns 0 if the connection succeeds, non-zero if it fails or times out.
#
# Measure latency with:
#   start=$(date +%s%3N)
#   ... check ...
#   end=$(date +%s%3N)
#   latency=$(( end - start ))
#
# Print structured output like:
#   host=api.internal port=8080 status=UP latency=12ms
# -----------------------------------------------------------------------

# TODO: implement check, capture latency, print structured output
echo "TODO: implement TCP health check for $host:$port"

# -----------------------------------------------------------------------
# STEP 5: Exit code.
# Exit 0 on success, exit 1 if the target is DOWN.
# When you extend to multiple targets, exit 1 if *any* target failed.
# -----------------------------------------------------------------------
