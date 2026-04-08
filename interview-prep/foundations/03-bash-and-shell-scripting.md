# Foundations: Bash And Shell Scripting For SRE

Shell skills matter because interviews often probe how you think under time pressure with simple tools.

## Mentor Mode

Shell is excellent for glue, inspection, and first-response tooling.

It becomes dangerous when:

- quoting is sloppy
- partial failure is ignored
- parsing assumptions are hidden
- destructive actions lack preview or guardrails

## Core Mindset

- prefer small, readable scripts over clever one-liners when the task matters
- quote variables
- fail early
- log what the script is doing
- make scripts safe to rerun

## Useful Patterns

### Safe Script Header

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

### Loops And Conditionals

```bash
for host in host1 host2 host3; do
  echo "Checking $host"
done

if [[ -f /etc/resolv.conf ]]; then
  echo "resolver exists"
fi
```

### Parsing Command Output Carefully

Prefer structured formats when possible. If not, document assumptions.

```bash
ss -tan | awk 'NR>1 {print $1, $4, $5}'
```

### Functions

```bash
log() {
  printf '%s %s\n' "$(date -Is)" "$*"
}
```

## Common Interview Tasks

1. Find the top five largest files in a path.
2. Count unique client IPs in a log.
3. Check whether a list of hosts resolves and responds on a TCP port.
4. Retry a command with backoff.
5. Search logs for a request ID across many files.

## Bash Challenges

### Challenge 1: Health Check Script

Write a script that:

- takes a host and port
- checks TCP reachability
- prints a timestamped success or failure line
- exits non-zero on failure

Hints:

- use `nc -z` or Bash TCP support if available
- think about timeouts

### Challenge 2: Log Summarizer

Write a script that:

- reads an NGINX access log
- prints top endpoints by request count
- prints top client IPs by 5xx count

Hints:

- split the problem into two small pipelines
- validate the log format before you assume field numbers

### Challenge 3: Safe Cleanup Script

Write a script that deletes files older than a threshold but first prints what it plans to remove.

Mentor tip:

- production scripting is as much about guardrails as logic

Useful commands:

```bash
find /path -type f -mtime +7
xargs
sort
uniq -c
awk
sed
jq
```
