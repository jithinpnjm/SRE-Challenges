#!/usr/bin/env python3
import sys


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else ""
    if not path:
      print(f"usage: {sys.argv[0]} LOG_FILE")
      return 1

    print("TODO: summarize JSON log errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
