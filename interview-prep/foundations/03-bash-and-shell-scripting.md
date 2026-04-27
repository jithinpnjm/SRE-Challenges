# Foundations: Bash Zero To Hero For SRE And Platform Engineers

Bash is the control language of Linux systems. It glues commands together, automates repetitive work, and helps you debug production quickly.

If Linux is the operating foundation, Bash is the hand tool you carry every day.

This guide is designed as a complete path:

- Beginner: terminal fluency and safe shell usage
- Intermediate: pipes, text processing, scripting fundamentals
- Advanced: robust automation, traps, parallelism, production safety
- SRE Level: outage one-liners, triage workflows, runbook scripting
- Interview Level: when to use Bash vs Python and how to reason clearly

---

# Part 1: What Bash Actually Is

Bash (Bourne Again Shell) is both:

1. an interactive shell
2. a scripting language

It primarily orchestrates other programs.

```text
stdin (0)  -> input
stdout (1) -> normal output
stderr (2) -> errors
exit code  -> success/failure signal
```

Unix philosophy:

> Small tools that do one thing well, combined with pipes.

---

# Part 2: Beginner Terminal Fluency

## Navigation

```bash
pwd
ls -lah
cd /path
mkdir demo
touch file.txt
cp a b
mv a b
rm file.txt
```

## Reading Files

```bash
cat file
less file
head -20 file
tail -50 file
tail -f /var/log/app.log
```

## Help Yourself Fast

```bash
man grep
command --help
which kubectl
type cd
history
```

---

# Part 3: Variables, Quoting, Expansion

## Variables

```bash
name="cluster-a"
count=3
echo "$name"
```

## Always Quote Variables

```bash
echo "$name"   # safe
echo $name     # risky if spaces/globs exist
```

## Command Substitution

```bash
pods=$(kubectl get pods --no-headers | wc -l)
now=$(date +%F-%H%M)
```

## Defaults

```bash
env=${ENV:-dev}
port=${PORT:=8080}
```

## Arithmetic

```bash
x=$((2 + 3))
((x++))
```

---

# Part 4: Safe Script Foundation

Every serious script should begin with:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

## Why

- `-e` stop on errors
- `-u` fail on unset vars
- `pipefail` catches pipeline failures
- safer word splitting

Without this, scripts can silently continue after failures.

---

# Part 5: Conditionals And Loops

## Conditionals

```bash
if [[ -f /etc/hosts ]]; then
  echo exists
fi

if [[ "$env" == "prod" ]]; then
  echo production
fi

if [[ $count -gt 10 ]]; then
  echo high
fi
```

## Loops

```bash
for host in web1 web2 web3; do
  echo "$host"
done

for i in {1..5}; do
  echo "$i"
done

while read -r line; do
  echo "$line"
done < file.txt
```

---

# Part 6: Functions

```bash
log(){ printf '[%s] %s\n' "$(date -Is)" "$*" >&2; }

die(){ log "ERROR: $*"; exit 1; }

require(){ command -v "$1" >/dev/null || die "missing $1"; }
```

Use functions to keep scripts readable and reusable.

---

# Part 7: Pipes And Text Processing (Intermediate)

## grep

```bash
grep ERROR app.log
grep -E 'ERROR|WARN' app.log
grep -c ERROR app.log
```

## awk

```bash
awk '{print $1}' file
awk -F: '{print $1}' /etc/passwd
awk '{sum+=$3} END {print sum}' data
```

## sed

```bash
sed 's/old/new/g' file
sed -n '1,20p' file
```

## sort / uniq

```bash
sort file | uniq -c | sort -rn
```

## cut / tr

```bash
cut -d: -f1 /etc/passwd
tr '[:lower:]' '[:upper:]'
```

---

# Part 8: JSON And APIs

Modern ops uses JSON everywhere.

## jq

```bash
kubectl get pods -o json | jq '.items[].metadata.name'
curl -s api.example.com | jq '.status'
```

## API Checks

```bash
curl -I https://example.com
curl -vk https://example.com/health
curl -s https://api.example.com | jq .
```

---

# Part 9: Production Bash Patterns (Advanced)

## Traps / Cleanup

```bash
cleanup(){ rm -f "$tmp"; }
trap cleanup EXIT
```

## Retry With Backoff

```bash
for i in 1 2 3; do
  curl -sf https://api && break
  sleep $((i*2))
done
```

## Idempotency

```bash
mkdir -p /opt/app
cp -n config /opt/app/
```

## Temp Files

```bash
tmp=$(mktemp)
```

## Safe Deletes

```bash
[[ -n "$target" ]] || exit 1
rm -rf "${target:?}/cache"
```

---

# Part 10: Parallelism And Speed

```bash
cmd1 &
cmd2 &
wait
```

Run host checks in parallel carefully.

```bash
for host in a b c; do
  ssh "$host" uptime &
done
wait
```

---

# Part 11: SRE One-Liners

## Top Disk Usage

```bash
du -sh /var/* | sort -rh | head
```

## Count HTTP Status Codes

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -rn
```

## Top Client IPs

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
```

## Watch Pods

```bash
watch -n 5 'kubectl get pods -A'
```

## Socket States

```bash
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c
```

---

# Part 12: When Bash vs Python?

## Use Bash When:

- chaining commands
- quick automation
- file/log processing
- deployment glue
- system admin tasks

## Use Python When:

- complex logic
- large data structures
- APIs with auth flows
- maintainable tooling
- long-term applications

Senior engineers know when to stop using Bash.

---

# Part 13: Real Incident Stories

## Log Disk Full

```bash
find /var/log -type f -size +500M
lsof +L1
```

## Service Down On Many Hosts

```bash
for h in app1 app2 app3; do ssh "$h" systemctl status myapp; done
```

## API Returning 500

```bash
curl -vk https://api/health
tail -f /var/log/app.log
```

---

# Part 14: Interview Questions

- Why `set -euo pipefail`?
- Why quote variables?
- When should Bash be replaced by Python?
- How would you safely run commands on 100 hosts?
- How would you parse logs quickly during an outage?

---

# Part 15: Labs

## Beginner

- write a backup script
- parse a CSV file
- create users and folders

## Intermediate

- health-check multiple hosts
- summarize nginx logs
- monitor disk growth

## Advanced

- deploy script with rollback
- parallel host executor
- retry wrapper with backoff

---

# Part 16: Senior Answer Shape

> I use Bash for fast, composable operational tasks close to the OS: command orchestration, deployment glue, diagnostics, and log processing. I make scripts safe with strict mode, quoting, traps, and idempotency. When logic becomes complex or long-lived, I move to Python for maintainability.

---

# Recall Prompts

- Why is quoting variables important?
- Why does pipefail matter?
- When is awk better than grep?
- Why use trap cleanup EXIT?
- When should Bash become Python?
