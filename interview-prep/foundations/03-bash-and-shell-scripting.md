# Bash and Shell Scripting for SRE

> Shell is the first tool you reach for in production. It is the glue between commands, the language of automation, and the medium of on-call incident response. Knowing Bash well is non-negotiable for any senior SRE role.

---

## What Is Bash?

Bash (Bourne Again Shell) is both a command-line interpreter and a scripting language. It is the default shell on almost every Linux system. When you run commands interactively at a terminal or write a `.sh` script, you are using Bash.

**Why SREs need deep Bash knowledge:**
- Most runbooks are Bash scripts
- One-liners diagnose production problems in seconds
- Automation tasks (cleanup jobs, health checks, data exports) are often simplest in Bash
- Understanding Bash prevents dangerous mistakes (accidental deletion, silent failures)

---

## Mental Model

Think of Bash as a meta-language that orchestrates other programs. Unlike Python, which is a complete programming language, Bash's primary purpose is composing Unix tools via pipes and redirection.

```
Every command has:
  - stdin (fd 0)   — input
  - stdout (fd 1)  — normal output
  - stderr (fd 2)  — error output
  - exit code       — 0=success, non-zero=failure

Pipes connect stdout of one command to stdin of the next.
```

---

## Part 1: Shell Fundamentals (Beginner)

### Safe Script Header

Every production Bash script should start with:
```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

What each option does:
- `set -e` — exit immediately if any command returns non-zero exit code
- `set -u` — treat unset variables as an error (prevents `$UNDEFINED` expanding to empty)
- `set -o pipefail` — a pipeline fails if any command in it fails (not just the last one)
- `IFS=$'\n\t'` — changes Internal Field Separator so word splitting only happens on newline/tab, not spaces (prevents splitting file names with spaces)

**Why this matters:** Without `set -euo pipefail`, a script can silently skip failures and continue to potentially destructive actions.

### Variables and Quoting

```bash
# Assignment — no spaces around =
name="production-cluster"
count=42

# ALWAYS quote variables to prevent word splitting and globbing
echo "$name"           # correct
echo $name             # dangerous: word-splits on spaces, expands * globs

# Command substitution
nodes=$(kubectl get nodes --no-headers | wc -l)
date_str=$(date +%Y%m%d-%H%M%S)

# Arithmetic
total=$((count * 2))
((count++))

# Default values
env=${ENVIRONMENT:-production}     # use "production" if ENVIRONMENT is unset
port=${PORT:=8080}                 # set PORT to 8080 if unset, and use it

# String operations
filename="backup-2024-01-15.tar.gz"
base="${filename%.tar.gz}"         # remove suffix: "backup-2024-01-15"
dir="${filename%/*}"               # remove after last /
ext="${filename##*.}"              # extract extension: "gz"
upper="${filename^^}"              # uppercase
lower="${filename,,}"              # lowercase
```

### Arrays

```bash
# Declare array
hosts=("web-01" "web-02" "web-03")

# Iterate
for host in "${hosts[@]}"; do
  echo "Checking $host"
done

# Length
echo "${#hosts[@]}"

# Append
hosts+=("web-04")

# Slice
echo "${hosts[@]:1:2}"   # elements 1 and 2: "web-02 web-03"

# Associative array (hash map)
declare -A health
health["web-01"]="ok"
health["web-02"]="degraded"

for host in "${!health[@]}"; do
  echo "$host: ${health[$host]}"
done
```

### Conditionals

```bash
# String tests
if [[ "$env" == "production" ]]; then
  echo "production mode"
fi

if [[ -z "$token" ]]; then         # -z = empty string
  echo "token is required" >&2
  exit 1
fi

if [[ -n "$debug" ]]; then         # -n = non-empty string
  set -x                           # trace mode
fi

# File tests
if [[ -f /etc/resolv.conf ]]; then   # -f = file exists
  echo "DNS config present"
fi

if [[ -d /var/log/myapp ]]; then     # -d = directory exists
  ls /var/log/myapp
fi

if [[ ! -r /etc/ssl/cert.pem ]]; then  # ! = not, -r = readable
  echo "Certificate not readable" >&2
  exit 1
fi

# Numeric tests
if [[ $count -gt 10 ]]; then        # -gt -lt -eq -ne -ge -le
  echo "High count: $count"
fi

# Pattern matching
if [[ "$region" == us-* ]]; then    # glob pattern
  echo "US region"
fi

if [[ "$input" =~ ^[0-9]+$ ]]; then  # regex
  echo "Input is a positive integer"
fi
```

### Loops

```bash
# For loop over list
for region in us-east-1 us-west-2 eu-west-1; do
  echo "Deploying to $region"
done

# For loop with range
for i in {1..10}; do
  echo "Item $i"
done

# C-style for loop
for ((i=0; i<10; i++)); do
  echo "Index $i"
done

# While loop
while [[ $(kubectl get nodes --no-headers | grep -c NotReady) -gt 0 ]]; do
  echo "Waiting for nodes..."
  sleep 10
done

# Read lines from file or command
while IFS= read -r line; do
  echo "Processing: $line"
done < /etc/hosts

# Read lines from command output
kubectl get pods --no-headers | while IFS= read -r line; do
  pod=$(awk '{print $1}' <<< "$line")
  status=$(awk '{print $3}' <<< "$line")
  echo "$pod is $status"
done
```

### Functions

```bash
# Define a function
log() {
  # Always write log to stderr so it doesn't pollute stdout data
  printf '[%s] %s\n' "$(date -Is)" "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
}

# Use the functions
require_command kubectl
require_command jq
log "Starting deployment"
```

---

## Part 2: Data Processing (Intermediate)

### Text Processing Toolkit

```bash
# grep — search text
grep "ERROR" /var/log/app.log
grep -E "ERROR|WARN" /var/log/app.log    # extended regex
grep -v "DEBUG" /var/log/app.log         # invert match (exclude DEBUG)
grep -c "ERROR" /var/log/app.log         # count matching lines
grep -n "ERROR" /var/log/app.log         # show line numbers
grep -r "password" /etc/                  # recursive search
grep -l "password" /etc/*.conf           # only filenames with match

# awk — column processing
awk '{print $1, $3}' access.log          # print columns 1 and 3
awk 'NR>1 {print $1}' data.csv           # skip header, print column 1
awk -F: '{print $1}' /etc/passwd         # custom delimiter, print usernames
awk '$5 > 1000 {print $1, $5}' data      # filter rows where col 5 > 1000
awk '{sum += $3} END {print sum}' data   # sum column 3

# sed — stream edit
sed 's/old/new/g' file.txt               # replace all
sed -i 's/old/new/g' file.txt            # in-place replace
sed -n '10,20p' file.txt                 # print lines 10-20
sed '/^#/d' config.conf                  # delete comment lines

# sort and uniq
sort -k2 -n data.txt                     # sort by column 2, numeric
sort -t: -k3 -n /etc/passwd              # sort by UID
sort data.txt | uniq -c | sort -rn       # frequency count, sorted
sort -u data.txt                         # unique lines

# cut — extract columns
cut -d: -f1,3 /etc/passwd               # fields 1 and 3 with : delimiter
cut -c1-10 file.txt                     # first 10 characters

# tr — translate/delete characters
tr '[:lower:]' '[:upper:]' <<< "hello"  # uppercase
tr -d '\r' < windows-file.txt           # remove carriage returns
tr -s ' ' <<< "too  many   spaces"      # squeeze repeated spaces

# head and tail
head -n 20 file.txt                     # first 20 lines
tail -n 50 file.txt                     # last 50 lines
tail -f /var/log/app.log                # follow in real time
tail -f /var/log/app.log | grep ERROR   # follow and filter
```

### JSON Processing with jq

```bash
# Basic field extraction
kubectl get pods -o json | jq '.items[].metadata.name'

# Filter array
kubectl get pods -o json | jq '.items[] | select(.status.phase == "Running")'

# Extract multiple fields
kubectl get pods -o json | jq '.items[] | {name: .metadata.name, phase: .status.phase}'

# Count
kubectl get pods -o json | jq '[.items[] | select(.status.phase != "Running")] | length'

# Aggregate
kubectl get pods -o json | jq '[.items[].status.phase] | group_by(.) | map({phase: .[0], count: length})'

# Nested selection
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  gpus: .status.allocatable["nvidia.com/gpu"]
}'
```

---

## Part 3: Production Patterns (Advanced)

### Error Handling and Traps

```bash
#!/usr/bin/env bash
set -euo pipefail

# Cleanup on exit
cleanup() {
  local exit_code=$?
  log "Script exiting with code $exit_code"
  # Remove temp files
  rm -f /tmp/deploy-lock-$$
  # Notify on failure
  if [[ $exit_code -ne 0 ]]; then
    echo "Deployment FAILED: $0 exited with code $exit_code" | mail -s "Deploy Failure" ops@company.com
  fi
}
trap cleanup EXIT

# Trap specific signals
trap 'die "Interrupted"' INT TERM

# Create temp files safely (cleaned up by trap)
tmpfile=$(mktemp /tmp/deploy.XXXXXX)
log "Using temp file: $tmpfile"
```

### Idempotent Scripts

Scripts that can be run multiple times without harm:

```bash
# Create directory only if it doesn't exist
mkdir -p /opt/myapp/config

# Copy file only if it's changed
if ! diff -q /etc/myapp/config.conf /opt/myapp/config/config.conf &>/dev/null; then
  cp /etc/myapp/config.conf /opt/myapp/config/config.conf
  log "Config updated"
fi

# Install package only if not already installed
if ! rpm -q mypackage &>/dev/null; then
  yum install -y mypackage
fi

# Apply kubectl config only if different
kubectl apply --dry-run=client -f deployment.yaml | grep -q "configured" && \
  kubectl apply -f deployment.yaml || log "No changes needed"
```

### Retry with Backoff

```bash
retry() {
  local -r cmd="$1"
  local -r max_attempts="${2:-3}"
  local -r base_delay="${3:-2}"
  local attempt=0

  until eval "$cmd"; do
    ((attempt++))
    if [[ $attempt -ge $max_attempts ]]; then
      log "Command failed after $max_attempts attempts: $cmd"
      return 1
    fi
    local delay=$(( base_delay * (2 ** (attempt - 1)) ))
    log "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
    sleep "$delay"
  done
}

# Usage
retry "curl -sf https://api.example.com/health" 5 1
retry "kubectl rollout status deployment/myapp --timeout=300s" 3 10
```

### Safe Deletion Patterns

```bash
# DRY RUN: always show what would be deleted before deleting
find /var/log/myapp -name "*.log" -mtime +30 -print    # list candidates
# Verify output looks right, then:
find /var/log/myapp -name "*.log" -mtime +30 -delete   # actually delete

# Never do this in production:
# rm -rf /var/data/$env/*   # what if $env is empty?

# Safe approach with variable validation:
[[ -n "$env" ]] || die "ENVIRONMENT variable is required"
[[ "$env" =~ ^(dev|staging|production)$ ]] || die "Invalid environment: $env"
target_dir="/var/data/$env"
[[ -d "$target_dir" ]] || die "Directory does not exist: $target_dir"
rm -rf "${target_dir:?}/cache"    # :? fails if var is empty/unset
```

### Parallel Execution

```bash
# Run commands in parallel with background jobs
for host in web-01 web-02 web-03; do
  {
    result=$(ssh "$host" "uptime")
    echo "$host: $result"
  } &
done
wait    # wait for all background jobs

# Parallel with controlled concurrency (max 5 at a time)
parallel_limit=5
active=0
for pod in $(kubectl get pods -o name); do
  kubectl logs "$pod" --since=1h &
  ((active++))
  if [[ $active -ge $parallel_limit ]]; then
    wait -n 2>/dev/null || wait    # wait for at least one to finish
    ((active--))
  fi
done
wait

# GNU parallel (if available)
kubectl get pods -o name | parallel -j5 kubectl logs {} --since=1h
```

---

## Part 4: Common SRE One-Liners

```bash
# Top 10 largest files in a directory
find /var/log -type f -printf '%s\t%p\n' | sort -rn | head -10

# Count unique IPs in nginx access log
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Count HTTP status codes in access log
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Find processes using most open file descriptors
for pid in /proc/[0-9]*/fd; do
  count=$(ls "$pid" 2>/dev/null | wc -l)
  echo "$count $pid"
done | sort -rn | head -10

# Check if a port is open on remote hosts
for host in web-{01..05}; do
  timeout 2 bash -c "echo >/dev/tcp/$host/443" 2>/dev/null && \
    echo "$host:443 OPEN" || echo "$host:443 CLOSED"
done

# Watch a metric in real time
watch -n 5 'kubectl top pods -n production | sort -k2 -rn | head -15'

# Find and kill processes matching a pattern (WITH CONFIRMATION)
pids=$(pgrep -f "defunct-worker")
echo "Will kill PIDs: $pids"
read -rp "Confirm? [y/N] " confirm
[[ "$confirm" == "y" ]] && kill $pids

# Disk usage by directory, sorted
du -sh /var/log/* | sort -rh | head -20

# Count connections per state
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn

# Watch log for errors in real time
tail -f /var/log/app.log | grep --line-buffered -E 'ERROR|FATAL|panic'
```

---

## Part 5: Interview Challenges

### Challenge 1: Health Checker

Write a script that:
- Takes a list of hosts and a port as arguments
- Checks TCP reachability for each host
- Prints a timestamped pass/fail line per host
- Exits with non-zero if any host fails

```bash
#!/usr/bin/env bash
set -euo pipefail

check_tcp() {
  local host="$1"
  local port="$2"
  local timeout="${3:-3}"
  if timeout "$timeout" bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
    printf '[%s] PASS %s:%s\n' "$(date -Is)" "$host" "$port"
    return 0
  else
    printf '[%s] FAIL %s:%s\n' "$(date -Is)" "$host" "$port" >&2
    return 1
  fi
}

usage() {
  echo "Usage: $0 <port> <host1> [host2 ...]" >&2
  exit 1
}

[[ $# -lt 2 ]] && usage
port="$1"; shift

failed=0
for host in "$@"; do
  check_tcp "$host" "$port" || failed=1
done

exit "$failed"
```

### Challenge 2: Log Summarizer

```bash
#!/usr/bin/env bash
# Summarize NGINX access log: top endpoints and top IPs with 5xx errors
set -euo pipefail

log="${1:-/var/log/nginx/access.log}"
[[ -f "$log" ]] || { echo "File not found: $log" >&2; exit 1; }

echo "=== Top 10 Endpoints by Request Count ==="
awk '{print $7}' "$log" | cut -d? -f1 | sort | uniq -c | sort -rn | head -10

echo ""
echo "=== Top 10 IPs with 5xx Errors ==="
awk '$9 ~ /^5/ {print $1}' "$log" | sort | uniq -c | sort -rn | head -10
```

---

## Points to Remember

- `set -euo pipefail` on every script — without it, scripts continue past failures silently
- Always quote `"$variables"` — unquoted variables expand in dangerous ways
- `[[ ]]` over `[ ]` — double brackets support regex, safer string comparison
- `trap cleanup EXIT` — ensures cleanup even when script fails
- Never `rm -rf $var/*` without validating `$var` is non-empty
- Use `/dev/tcp/host/port` for TCP checks without requiring `nc` or `curl`
- `mktemp` for temp files — guaranteed unique names, cleaned up by `trap`
- `>&2` to write errors to stderr — keeps stdout clean for piping

## What to Study Next

- [04-python-for-sre.md](./04-python-for-sre.md) — when to switch from Bash to Python
- [05-linux-debug-playbook.md](./05-linux-debug-playbook.md) — apply these tools to real debugging
- Hands-on labs: [../hands-on-labs/bash/](../hands-on-labs/bash/)
