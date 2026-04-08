# Bash Lab 1: Health Check Script

## Goal

Write a script that checks TCP reachability for a host and port and exits non-zero on failure.

## Starter

Use [starter/health_check.sh](starter/health_check.sh).

## Tasks

1. Add argument validation.
2. Add a timestamped log line.
3. Add timeout handling.
4. Make the exit code meaningful.
5. Print a friendly usage message when inputs are missing.

## Mentor Tips

- solve one host and one port first
- only add loops after the simple case works
- do not hide failures behind pretty output
