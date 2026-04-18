#!/usr/bin/env bash
# log_summary.sh — NGINX access log summarizer
# Usage: ./log_summary.sh LOG_FILE
set -euo pipefail

log_file="${1:-}"

if [[ -z "$log_file" ]]; then
  echo "usage: $0 LOG_FILE" >&2
  exit 1
fi

# -----------------------------------------------------------------------
# STEP 1: Validate the file exists before trying to parse it.
# Use: [[ ! -f "$log_file" ]]
# Print the error to stderr and exit 1.
# -----------------------------------------------------------------------

# TODO: add file existence check here

# -----------------------------------------------------------------------
# STEP 2: Understand field positions BEFORE writing awk.
# NGINX combined log format:
#   $1=client_ip  $4=date  $6=method  $7=path  $9=status  $10=bytes
#
# Verify with:
#   awk '{print $9}' "$log_file" | head -5
# You should see numbers like 200, 404, 500.
# -----------------------------------------------------------------------

# -----------------------------------------------------------------------
# STEP 3: Count requests per status code.
# Core pipeline pattern:
#   awk '{print $9}' "$log_file" | sort | uniq -c | sort -rn
#
# Wrap this in a function called status_summary().
# Reformat output so status code comes first, then count:
#   awk '{printf "  %-6s %s\n", $2, $1}'
# -----------------------------------------------------------------------

status_summary() {
    local file="$1"
    echo "=== Requests by Status Code ==="
    # TODO: implement using awk + sort + uniq -c + sort -rn + awk for formatting
}

# -----------------------------------------------------------------------
# STEP 4: Count requests per endpoint (top 10).
# Same pattern as status_summary but use $7 (the request path).
# Add | head -10 to limit to top 10.
# Strip query strings with: awk '{split($7, a, "?"); print a[1]}'
# -----------------------------------------------------------------------

endpoint_summary() {
    local file="$1"
    echo "=== Top Endpoints by Request Count ==="
    # TODO: implement using awk (field $7) + sort + uniq -c + sort -rn + head
}

# -----------------------------------------------------------------------
# STEP 5: Find IPs generating 5xx errors.
# Pattern to match status codes starting with 5:
#   awk '$9 ~ /^5/ {print $1}' "$log_file"
# Then sort | uniq -c | sort -rn | head -10
# -----------------------------------------------------------------------

error_clients() {
    local file="$1"
    echo "=== Top IPs with 5xx Responses ==="
    # TODO: implement using awk filter on $9 + sort + uniq -c + sort -rn
}

# -----------------------------------------------------------------------
# STEP 6: Main — print total line count, then call each summary.
# Use wc -l to count lines.
# Print a blank line between sections for readability.
# -----------------------------------------------------------------------

total=$(wc -l < "$log_file")
echo "Log: $log_file  (${total} lines)"
echo ""

# TODO: call status_summary, endpoint_summary, error_clients with "$log_file"
echo "TODO: print useful summaries for $log_file"
