#!/usr/bin/env bash
set -euo pipefail

log_file="${1:-}"

if [[ -z "$log_file" ]]; then
  echo "usage: $0 LOG_FILE"
  exit 1
fi

echo "TODO: print useful summaries for $log_file"
