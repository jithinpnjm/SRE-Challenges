# Foundations: Python Zero To Hero For SRE And Platform Engineers

Python is the language you reach for when Bash becomes too fragile.

For SRE work, Python is not mainly about algorithms. It is about writing reliable automation: tools that call APIs, parse structured data, inspect systems, retry safely, log clearly, and fail predictably.

This guide is designed as a complete path:

- Beginner: Python syntax, data structures, files, functions
- Intermediate: JSON/YAML, HTTP APIs, subprocesses, logging, exceptions
- Advanced: retries, concurrency, CLIs, testing, packaging, type hints
- SRE Level: Kubernetes/cloud automation, health checks, incident tooling
- Interview Level: explain when Python beats Bash and how to design maintainable ops tools

---

# Part 1: What Python Is For In SRE

Use Python when you need:

- structured data handling
- API integration
- complex branching logic
- maintainable automation
- tests
- retries and timeouts
- reusable internal tools

Use Bash when you are mostly chaining commands.

Use Python when logic becomes a program.

---

# Part 2: Beginner Python Foundations

## Variables And Types

```python
service = "checkout"
replicas = 3
healthy = True
latency_ms = 245.7
```

Python is dynamically typed, but values still have real types.

```python
print(type(service))
print(type(replicas))
```

## Strings

```python
host = "web-01.prod.example.com"
print(host.upper())
print(host.startswith("web"))
print("prod" in host)
parts = host.split(".")
```

## f-strings

```python
namespace = "production"
pod = "api-7d9f"
print(f"Checking {namespace}/{pod}")
```

---

# Part 3: Core Data Structures

## Lists

```python
pods = ["api-1", "api-2"]
pods.append("api-3")
for pod in pods:
    print(pod)
```

## Dictionaries

```python
status = {
    "api-1": "Running",
    "api-2": "CrashLoopBackOff",
}
print(status.get("api-3", "Unknown"))
```

## Sets

```python
expected = {"api-1", "api-2", "api-3"}
actual = {"api-1", "api-2"}
missing = expected - actual
```

## Comprehensions

```python
healthy = [name for name, phase in status.items() if phase == "Running"]
```

---

# Part 4: Functions And Program Structure

```python
def is_healthy(status_code: int) -> bool:
    return 200 <= status_code < 300
```

Use functions when a block of logic has a name.

Good SRE tools are built from small testable functions.

---

# Part 5: Files, Paths, JSON, YAML

## pathlib

```python
from pathlib import Path

path = Path("/var/log/app.log")
if path.exists():
    print(path.read_text()[:1000])
```

## JSON

```python
import json

raw = '{"service":"api","replicas":3}'
data = json.loads(raw)
print(data["service"])
```

## YAML

```python
import yaml
from pathlib import Path

manifest = yaml.safe_load(Path("deployment.yaml").read_text())
print(manifest["kind"])
```

Use YAML for Kubernetes/Terraform-adjacent config, but parse it carefully.

---

# Part 6: Exceptions And Exit Codes

External systems fail. Files disappear. APIs timeout. Permissions break.

```python
import sys
import logging

try:
    data = Path("config.json").read_text()
except FileNotFoundError:
    logging.error("config.json missing")
    sys.exit(1)
```

Rules:

- catch specific exceptions first
- log useful context
- exit non-zero on failure
- avoid swallowing errors silently

---

# Part 7: Logging Like An Operator

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

logger.info("starting health check")
logger.error("service unhealthy", extra={"service": "checkout"})
```

For production tools, logs should answer:

- what happened?
- where?
- when?
- what input?
- what action was taken?

---

# Part 8: Running Commands Safely

Use `subprocess.run` with list arguments.

```python
import subprocess

result = subprocess.run(
    ["kubectl", "get", "pods", "-o", "json"],
    capture_output=True,
    text=True,
    timeout=30,
    check=True,
)
print(result.stdout)
```

Avoid `shell=True` unless you fully control the command.

---

# Part 9: HTTP APIs With Timeouts

```python
import urllib.request

with urllib.request.urlopen("https://example.com", timeout=5) as resp:
    body = resp.read()
    print(resp.status)
```

Always set timeouts. A production tool that can hang forever is dangerous.

---

# Part 10: Retries And Backoff

Retries help with transient failures. Bad retries amplify outages.

```python
import random
import time

def retry(fn, attempts=3, base_delay=1.0):
    last_error = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as e:
            last_error = e
            if i == attempts - 1:
                break
            delay = random.uniform(0, base_delay * (2 ** i))
            time.sleep(delay)
    raise last_error
```

Use jitter to avoid thundering herds.

---

# Part 11: Dataclasses And Type Hints

```python
from dataclasses import dataclass

@dataclass
class CheckResult:
    target: str
    ok: bool
    latency_ms: float
    error: str = ""
```

Type hints help future you and teammates understand the tool.

---

# Part 12: Building CLIs

```python
import argparse

parser = argparse.ArgumentParser(description="Check service health")
parser.add_argument("url")
parser.add_argument("--timeout", type=float, default=5.0)
args = parser.parse_args()
```

Good CLIs include:

- help text
- clear flags
- useful exit codes
- readable output

---

# Part 13: Concurrency For SRE Tools

Use threads for network IO.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

hosts = ["example.com", "github.com"]

def check(host):
    return host

with ThreadPoolExecutor(max_workers=10) as pool:
    futures = [pool.submit(check, h) for h in hosts]
    for future in as_completed(futures):
        print(future.result())
```

Do not create unlimited workers. You can overload the system you are checking.

---

# Part 14: Kubernetes Automation Example

```python
import json
import subprocess

result = subprocess.run(
    ["kubectl", "get", "pods", "-A", "-o", "json"],
    capture_output=True,
    text=True,
    check=True,
)

data = json.loads(result.stdout)
for pod in data["items"]:
    name = pod["metadata"]["name"]
    ns = pod["metadata"].get("namespace", "default")
    phase = pod.get("status", {}).get("phase", "Unknown")
    if phase != "Running":
        print(f"{ns}/{name}: {phase}")
```

This is where Python beats Bash: structured parsing and clear logic.

---

# Part 15: Testing SRE Tools

```python
def is_success(code: int) -> bool:
    return 200 <= code < 300


def test_is_success():
    assert is_success(200)
    assert is_success(204)
    assert not is_success(500)
```

Testing matters when tools can affect production.

Use:

- pytest
- unittest.mock
- small pure functions
- sample JSON fixtures

---

# Part 16: Packaging And Project Structure

A simple SRE tool can be structured like:

```text
healthcheck/
  pyproject.toml
  src/healthcheck/__init__.py
  src/healthcheck/cli.py
  src/healthcheck/checks.py
  tests/test_checks.py
```

This makes the tool maintainable.

---

# Part 17: Real Incident Stories

## Bash Script Became Unmaintainable

Symptoms:

- many nested `if` blocks
- JSON parsed with grep
- no tests
- inconsistent failures

Better path:

- rewrite as Python CLI
- parse JSON properly
- add tests
- add logging and timeouts

## Health Checker Hung During Incident

Cause:

- no HTTP timeout

Fix:

- every network call gets timeout
- retries use bounded backoff
- tool exits non-zero on failure

## Kubernetes Audit Needed Quickly

Python can list all pods, group by namespace, summarize restarts, and print actionable output.

---

# Part 18: Bash Vs Python Decision Table

| Use Bash | Use Python |
|---|---|
| simple command chaining | complex logic |
| one-liners | reusable tool |
| text streams | JSON/YAML/API data |
| quick runbook steps | tests and maintainability |
| shell-native operations | structured error handling |

---

# Part 19: Interview Questions

- When would you replace Bash with Python?
- Why are timeouts mandatory?
- How would you design a Kubernetes health-check tool?
- Why avoid `shell=True`?
- How do you test automation safely?
- How do you prevent retries from making outages worse?

---

# Part 20: Labs

## Beginner

- read a file and count error lines
- parse JSON
- write a simple CLI

## Intermediate

- call an HTTP endpoint with timeout
- run `kubectl` and parse JSON
- summarize pod states

## Advanced

- add retry/backoff
- run parallel health checks
- write pytest tests
- package as a CLI tool

---

# Part 21: Senior Answer Shape

> I use Python when operational automation needs structure: APIs, JSON/YAML parsing, retries, timeouts, tests, and maintainability. I avoid shell injection by using subprocess list arguments, set explicit timeouts for every external call, log meaningful context, and design tools with clear exit codes so they fit into CI/CD and runbooks.

---

# Recall Prompts

- Why is Python better than Bash for JSON-heavy workflows?
- Why should every network call have a timeout?
- Why is `shell=True` dangerous?
- What makes an SRE tool production-quality?
- How do retries create risk during outages?
