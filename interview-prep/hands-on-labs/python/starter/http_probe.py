#!/usr/bin/env python3
import sys


def main() -> int:
    urls = sys.argv[1:]
    if not urls:
        print(f"usage: {sys.argv[0]} URL [URL...]")
        return 1

    print("TODO: probe URLs and print status, latency, and size")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
