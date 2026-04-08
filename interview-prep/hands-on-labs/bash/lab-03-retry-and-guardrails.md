# Bash Lab 3: Retry Wrapper With Guardrails

## Goal

Build a small wrapper that retries a command with capped backoff and useful logging.

## Starter

Use [starter/retry.sh](starter/retry.sh).

## Tasks

1. Add attempt counting.
2. Add exponential backoff with a max sleep.
3. Preserve the failing exit code when retries are exhausted.
4. Explain where this wrapper is safe and where it is dangerous.

## Mentor Tip

Retry logic is not always help. It can amplify overload or turn one bad dependency into a system-wide storm.
