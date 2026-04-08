#!/usr/bin/env python3
import json
import sys


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        print("usage: kubectl get events -A -o json | python3 k8s_event_summary.py")
        return 1

    data = json.loads(raw)
    print(f"TODO: summarize warning events from {len(data.get('items', []))} items")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
