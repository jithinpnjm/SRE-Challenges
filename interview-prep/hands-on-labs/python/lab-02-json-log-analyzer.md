# Python Lab 2: JSON Log Analyzer

## Goal

Read newline-delimited JSON logs and summarize error types.

## Data

Use [../shared/data/sample-json-logs.ndjson](../shared/data/sample-json-logs.ndjson).

## Starter

Use [starter/json_log_analyzer.py](starter/json_log_analyzer.py).

## Tasks

1. Handle malformed lines safely.
2. Group by `error_type`.
3. Print top error categories.
4. Print count by service name.
5. Explain why defensive parsing matters in incident tooling.
