# Foundations: Python For SRE And Automation

Python is valuable for automation, API work, log parsing, data shaping, and small reliability tools.

## Mentor Mode

Python is usually the right step when shell starts fighting structure, error handling, or testing.

## How To Think

Use Python when:

- shell becomes hard to read
- you need structured parsing
- you need HTTP APIs, JSON handling, retries, or better error handling
- you want tests around your automation

## Core Skills To Practice

- argument parsing with `argparse`
- file and JSON handling
- HTTP calls with timeouts
- retries with clear limits
- structured logging
- small reusable functions

## Skeleton Script

```python
#!/usr/bin/env python3
import argparse
import json
import logging
import sys
from urllib.request import urlopen

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()

    with urlopen(args.url, timeout=5) as response:
        body = response.read().decode("utf-8")
        logging.info("status_ok bytes=%s", len(body))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## Python Challenges

### Challenge 1: HTTP Probe

Write a script that:

- accepts a list of URLs
- fetches each URL with a timeout
- prints status code, latency, and body size
- exits non-zero if any required endpoint fails

Hints:

- measure time around the request
- keep network timeouts explicit

### Challenge 2: Parse JSON Logs

Write a script that:

- reads newline-delimited JSON logs
- groups by error type
- prints top errors and counts

Hints:

- guard against malformed lines
- do not assume every key exists

### Challenge 3: Retry With Backoff

Write a function that retries a failing HTTP call with capped exponential backoff and jitter.

Mentor tip:

- interviewers want to see that you understand reliability tradeoffs, not only syntax

### Challenge 4: K8s Event Reporter

Write a script that:

- calls `kubectl get events -A -o json`
- extracts warnings
- prints the most frequent reasons by namespace

Useful libraries to know:

- `argparse`
- `json`
- `subprocess`
- `collections`
- `logging`
- `time`
- `pathlib`
