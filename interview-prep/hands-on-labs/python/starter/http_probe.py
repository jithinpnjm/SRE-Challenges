#!/usr/bin/env python3
"""
http_probe.py — HTTP health probe utility
Usage: python3 http_probe.py URL [URL...] [--timeout SECONDS]

Probes one or more URLs and reports status code, latency, and response size.
Exits 0 if all probes pass, 1 if any fail.
"""
import sys
import time
# TODO: import argparse for --timeout flag
# TODO: import requests for HTTP calls


# -----------------------------------------------------------------------
# STEP 1: Define a probe() function that checks one URL.
# It should return True on success, False on failure.
# Signature: def probe(url: str, timeout_s: float) -> bool
#
# Core pattern:
#   try:
#       start = time.monotonic()   # use monotonic, not time.time()
#       response = requests.get(url, timeout=timeout_s)
#       latency_ms = int((time.monotonic() - start) * 1000)
#       ok = response.status_code < 500
#       status_label = "[PASS]" if ok else "[FAIL]"
#       print(f"{status_label} {url}  status={response.status_code}  latency={latency_ms}ms  size={len(response.content)}B")
#       return ok
#   except requests.exceptions.Timeout:
#       print(f"[FAIL] {url}  status=TIMEOUT  latency={int(timeout_s*1000)}ms  size=0B")
#       return False
#   except requests.exceptions.ConnectionError as exc:
#       print(f"[FAIL] {url}  status=CONNECTION_ERROR  detail={exc}  size=0B")
#       return False
#   except requests.exceptions.RequestException as exc:
#       print(f"[FAIL] {url}  status=ERROR  detail={exc}  size=0B")
#       return False
#
# Note: catch exceptions from most-specific to least-specific.
# Timeout is a subclass of RequestException — if you only catch RequestException,
# you lose the ability to distinguish timeouts from connection errors.
# -----------------------------------------------------------------------

def probe(url: str, timeout_s: float) -> bool:
    # TODO: implement using the pattern above
    print(f"TODO: probe {url}")
    return False


def main() -> int:
    # -----------------------------------------------------------------------
    # STEP 2: Parse arguments with argparse.
    # Accept one or more positional URL arguments and an optional --timeout flag.
    # Example:
    #   parser = argparse.ArgumentParser(description="HTTP health probe")
    #   parser.add_argument("urls", nargs="+", help="URLs to probe")
    #   parser.add_argument("--timeout", type=float, default=5.0)
    #   args = parser.parse_args()
    # -----------------------------------------------------------------------

    urls = sys.argv[1:]
    if not urls:
        print(f"usage: {sys.argv[0]} URL [URL...]", file=sys.stderr)
        return 1

    timeout_s = 5.0  # TODO: replace with args.timeout after adding argparse

    # -----------------------------------------------------------------------
    # STEP 3: Probe each URL and count failures.
    # Call probe() for each URL. Track how many return False.
    # Print a summary line at the end: "Summary: N/M passed, F failed"
    # Return 0 if no failures, 1 if any failures.
    # -----------------------------------------------------------------------

    failures = 0
    for url in urls:
        ok = probe(url, timeout_s)
        if not ok:
            failures += 1

    # TODO: print summary line
    # TODO: return 0 if no failures, 1 otherwise
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
