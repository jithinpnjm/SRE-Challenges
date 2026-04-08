#!/usr/bin/env bash
set -euo pipefail

host="${1:-}"
port="${2:-}"

if [[ -z "$host" || -z "$port" ]]; then
  echo "usage: $0 HOST PORT"
  exit 1
fi

echo "TODO: implement TCP health check for $host:$port"
