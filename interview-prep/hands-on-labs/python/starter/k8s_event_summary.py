#!/usr/bin/env python3
"""
k8s_event_summary.py — Kubernetes Warning event summarizer
Usage: kubectl get events -A -o json | python3 k8s_event_summary.py

Reads JSON from stdin (kubectl output), filters Warning events,
and prints a summary grouped by reason and namespace.
"""
import json
import sys
from collections import Counter


# -----------------------------------------------------------------------
# STEP 1: Filter to Warning events only.
# The input data has structure: {"items": [ {...}, {...} ]}
# Each item has a "type" field which is either "Normal" or "Warning".
#
# Pattern:
#   def get_warnings(items: list) -> list:
#       return [item for item in items if item.get("type") == "Warning"]
#
# After filtering, print to stderr how many warnings vs total.
# -----------------------------------------------------------------------

def get_warnings(items: list) -> list:
    # TODO: filter to Warning type only
    return items  # replace this


# -----------------------------------------------------------------------
# STEP 2: Count by reason.
# Use Counter on item.get("reason", "Unknown").
# Print top 10 using counts.most_common(10).
# -----------------------------------------------------------------------

def reason_summary(warnings: list) -> None:
    print("\n=== Warning Events by Reason ===")
    # TODO: implement using Counter and .most_common(10)


# -----------------------------------------------------------------------
# STEP 3: Count by namespace.
# Namespace is at item["metadata"]["namespace"] — but use .get() safely:
#   event.get("metadata", {}).get("namespace")
# Also check involvedObject.namespace as a fallback.
# If both are absent, use "(cluster-scoped)" as the label.
# -----------------------------------------------------------------------

def namespace_summary(warnings: list) -> None:
    print("\n=== Warning Events by Namespace ===")
    # TODO: implement — remember to handle missing namespace gracefully


# -----------------------------------------------------------------------
# STEP 4: Show top events by occurrence count.
# Each event has a "count" field (how many times it was reported).
# Sort warnings by event["count"] descending and show the top 10.
# Print: namespace, reason, involvedObject kind/name, count.
#
# Helper to get namespace safely:
#   ns = event.get("metadata", {}).get("namespace", "")
# Helper to get involved object:
#   obj = event.get("involvedObject", {})
#   name = f"{obj.get('kind','')}/{obj.get('name','')}"
# -----------------------------------------------------------------------

def top_events(warnings: list, n: int = 10) -> None:
    print(f"\n=== Top {n} Events by Occurrence Count ===")
    # TODO: sort by event.get("count", 0) descending and print top n


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        print("usage: kubectl get events -A -o json | python3 k8s_event_summary.py",
              file=sys.stderr)
        return 1

    # -----------------------------------------------------------------------
    # STEP 5: Parse the JSON, then wire everything together.
    # Wrap json.loads in try/except json.JSONDecodeError and return 2 on error.
    # Extract items with: data.get("items", [])   — never data["items"]
    # Then call: get_warnings, reason_summary, namespace_summary, top_events
    # -----------------------------------------------------------------------

    data = json.loads(raw)
    items = data.get("items", [])
    print(f"TODO: summarize warning events from {len(items)} items")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
