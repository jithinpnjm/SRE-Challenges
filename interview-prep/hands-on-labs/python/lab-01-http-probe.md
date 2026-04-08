# Python Lab 1: HTTP Probe Utility

## Goal

Write a small probe tool that checks one or more URLs and reports status code, latency, and body size.

## Starter

Use [starter/http_probe.py](starter/http_probe.py).

## Tasks

1. Parse one or more URLs from the command line.
2. Add a timeout.
3. Measure request latency.
4. Print useful output for both success and failure.
5. Exit non-zero if any required probe fails.

## Mentor Tips

- keep timeouts explicit
- keep error messages useful
- readable output matters in operational tools
