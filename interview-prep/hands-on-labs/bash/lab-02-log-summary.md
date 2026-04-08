# Bash Lab 2: Access Log Summary

## Goal

Extract useful operational summaries from an access log.

## Data

Use [../shared/logs/sample-nginx-access.log](../shared/logs/sample-nginx-access.log).

## Starter

Use [starter/log_summary.sh](starter/log_summary.sh).

## Tasks

1. Print top endpoints by request count.
2. Print top client IPs causing 5xx responses.
3. Print the count of requests per status code.
4. Keep the script readable.

## Mentor Tips

- confirm the field positions before you rely on them
- build one summary at a time
- use comments only where the parsing is not obvious
