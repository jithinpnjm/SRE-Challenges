#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 command [args...]"
  exit 1
fi

echo "TODO: implement retry wrapper for command: $*"
