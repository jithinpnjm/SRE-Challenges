# Python for SRE and Automation

> Python is the SRE's second language after Bash — used when shell scripting becomes too fragile, when you need structured data handling, retries, tests, or API integration. At senior/staff level, you are expected to write production-quality Python tooling, not just one-off scripts.

---

## What Is It and Why It Matters

Python is a high-level, interpreted language with an enormous standard library and ecosystem. For SRE work, it excels at:
- Automation tools that would be unwieldy in Bash (complex logic, error handling, testing)
- API clients and integrations (Kubernetes, cloud providers, monitoring systems)
- Log and data processing at scale
- Operational tooling that needs to be maintained by multiple people over time

**When to use Python over Bash:**
- Logic is complex (nested conditions, multiple failure modes)
- You need structured data (JSON, CSV, YAML parsing)
- You need HTTP calls with retries, timeouts, auth
- You need the script to be testable
- Other people need to maintain this code

---

## Mental Model

Python for SRE is not about writing algorithms — it is about writing **reliable automation**. Reliable means:
- Handles errors gracefully (every external call can fail)
- Has explicit timeouts (never hangs indefinitely)
- Has structured logging (know what it did and when)
- Exits with correct exit codes (composable in pipelines)
- Is idempotent when appropriate (safe to run multiple times)

---

## Part 1: The Foundation (Beginner)

### Python Type System and Data Structures

```python
# Strings — immutable
host = "web-01.prod.example.com"
parts = host.split(".")           # ['web-01', 'prod', 'example', 'com']
hostname = ".".join(parts[:2])    # 'web-01.prod'
upper = host.upper()
starts = host.startswith("web")   # True
contains = "prod" in host         # True

# f-strings — preferred for formatting
pod_name = "web-app"
namespace = "production"
msg = f"Pod {pod_name} in namespace {namespace} is starting"

# Lists
pods = ["web-01", "web-02", "web-03"]
pods.append("web-04")
pods.extend(["web-05", "web-06"])
first = pods[0]
last = pods[-1]
slice_ = pods[1:3]                # ["web-02", "web-03"]

# Dictionaries — O(1) lookup
node_status = {
    "web-01": "healthy",
    "web-02": "degraded",
    "web-03": "healthy",
}
status = node_status.get("web-04", "unknown")  # default if key missing

# Sets — for uniqueness and membership testing
active = {"web-01", "web-02", "web-03"}
expected = {"web-01", "web-02", "web-03", "web-04"}
missing = expected - active      # {"web-04"} — set difference

# Comprehensions
healthy = [h for h in node_status if node_status[h] == "healthy"]
counts = {host: len(host) for host in pods}
```

### File I/O

```python
from pathlib import Path
import json

# Read file
config_path = Path("/etc/myapp/config.json")
if not config_path.exists():
    raise FileNotFoundError(f"Config not found: {config_path}")

config = json.loads(config_path.read_text())

# Write file atomically (write to temp, then rename)
import tempfile, os

def write_atomically(path: Path, content: str) -> None:
    """Write to a temp file then rename — prevents partial writes."""
    with tempfile.NamedTemporaryFile(
        mode='w',
        dir=path.parent,
        delete=False,
        suffix='.tmp'
    ) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    os.replace(tmp_path, path)  # atomic on same filesystem

# Read line by line (memory efficient for large files)
def count_errors(log_path: Path) -> int:
    count = 0
    with open(log_path) as f:
        for line in f:       # generator — reads one line at a time
            if "ERROR" in line:
                count += 1
    return count
```

### Exception Handling

```python
import logging

# Be specific about what you catch
try:
    result = risky_operation()
except FileNotFoundError as e:
    logging.error("Config file missing: %s", e)
    sys.exit(1)
except PermissionError as e:
    logging.error("Permission denied: %s", e)
    sys.exit(1)
except Exception as e:
    # Last resort — log the type to help debugging
    logging.exception("Unexpected error in risky_operation")
    sys.exit(1)
finally:
    cleanup()  # always runs

# Custom exceptions for your tools
class HealthCheckError(Exception):
    """Raised when a health check fails."""
    def __init__(self, endpoint: str, status: int):
        self.endpoint = endpoint
        self.status = status
        super().__init__(f"Health check failed: {endpoint} returned {status}")
```

---

## Part 2: Production Patterns (Intermediate)

### Structured Logging

```python
import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """Emit log records as JSON lines — useful for log aggregation (Loki, ELK)."""
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.root.setLevel(getattr(logging, level.upper()))
    logging.root.addHandler(handler)

# Usage
setup_logging()
logger = logging.getLogger(__name__)
logger.info("Starting health check", extra={"target": "api.example.com"})
logger.error("Check failed", extra={"status_code": 503, "latency_ms": 5200})
```

### HTTP Calls with Timeouts and Retries

```python
import urllib.request
import urllib.error
import time
import random
import logging
from dataclasses import dataclass
from typing import Optional

@dataclass
class HTTPResponse:
    status_code: int
    body: bytes
    latency_ms: float

def http_get(
    url: str,
    timeout_s: float = 10.0,
    headers: Optional[dict] = None,
) -> HTTPResponse:
    """Single HTTP GET with timeout."""
    req = urllib.request.Request(url, headers=headers or {})
    start = time.monotonic()
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        body = resp.read()
        return HTTPResponse(
            status_code=resp.status,
            body=body,
            latency_ms=(time.monotonic() - start) * 1000
        )

def http_get_with_retry(
    url: str,
    max_attempts: int = 3,
    base_delay_s: float = 1.0,
    max_delay_s: float = 30.0,
    timeout_s: float = 10.0,
) -> HTTPResponse:
    """HTTP GET with exponential backoff and full jitter."""
    last_exc: Optional[Exception] = None
    
    for attempt in range(max_attempts):
        try:
            return http_get(url, timeout_s=timeout_s)
        except (urllib.error.URLError, TimeoutError) as e:
            last_exc = e
            if attempt < max_attempts - 1:
                delay = min(base_delay_s * (2 ** attempt), max_delay_s)
                jitter = random.uniform(0, delay)
                logging.warning(
                    "Attempt %d/%d failed for %s (%s). Retrying in %.1fs",
                    attempt + 1, max_attempts, url, e, jitter
                )
                time.sleep(jitter)
    
    raise RuntimeError(f"All {max_attempts} attempts failed for {url}") from last_exc
```

### Running Shell Commands

```python
import subprocess
import logging
from typing import Optional

def run_command(
    cmd: list[str],
    timeout_s: float = 30.0,
    check: bool = True,
    capture: bool = True,
) -> subprocess.CompletedProcess:
    """
    Run a command safely.
    
    ALWAYS use list form (not shell=True) to prevent injection.
    """
    logging.debug("Running: %s", " ".join(cmd))
    result = subprocess.run(
        cmd,                          # list — no shell injection
        capture_output=capture,
        text=True,
        timeout=timeout_s,
        check=check,                  # raises CalledProcessError on non-zero
    )
    return result

def kubectl(
    *args: str,
    namespace: Optional[str] = None,
    timeout_s: float = 30.0,
) -> str:
    """Run kubectl and return stdout."""
    cmd = ["kubectl"]
    if namespace:
        cmd += ["-n", namespace]
    cmd += list(args)
    result = run_command(cmd, timeout_s=timeout_s)
    return result.stdout

# Usage
pods_json = kubectl("get", "pods", "-o", "json", namespace="production")
pods = json.loads(pods_json)
```

### Dataclasses for Structured Data

```python
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

@dataclass
class PodHealth:
    name: str
    namespace: str
    phase: str
    ready: bool
    restart_count: int
    node: str
    last_checked: datetime = field(default_factory=datetime.utcnow)
    error: Optional[str] = None

    def is_healthy(self) -> bool:
        return self.phase == "Running" and self.ready and self.restart_count < 10

    def __str__(self) -> str:
        status = "healthy" if self.is_healthy() else "UNHEALTHY"
        return f"{self.namespace}/{self.name} [{self.phase}] {status}"

def get_pod_health(pod_data: dict) -> PodHealth:
    """Parse Kubernetes pod JSON into a typed object."""
    meta = pod_data["metadata"]
    status = pod_data.get("status", {})
    containers = status.get("containerStatuses", [])
    
    ready = all(c.get("ready", False) for c in containers)
    restarts = sum(c.get("restartCount", 0) for c in containers)
    
    return PodHealth(
        name=meta["name"],
        namespace=meta.get("namespace", "default"),
        phase=status.get("phase", "Unknown"),
        ready=ready,
        restart_count=restarts,
        node=spec.get("nodeName", "unknown") if (spec := pod_data.get("spec")) else "unknown",
    )
```

### Context Managers

```python
from contextlib import contextmanager, suppress
import os
import tempfile

@contextmanager
def temp_kubeconfig(cluster_config: dict):
    """Write a temporary kubeconfig file, clean up after use."""
    with tempfile.NamedTemporaryFile(
        mode='w', suffix='.yaml', delete=False
    ) as f:
        import yaml
        yaml.dump(cluster_config, f)
        kubeconfig_path = f.name
    
    original = os.environ.get("KUBECONFIG")
    os.environ["KUBECONFIG"] = kubeconfig_path
    try:
        yield kubeconfig_path
    finally:
        os.environ.pop("KUBECONFIG")
        if original:
            os.environ["KUBECONFIG"] = original
        with suppress(FileNotFoundError):
            os.unlink(kubeconfig_path)

# Usage
with temp_kubeconfig(cluster_cfg) as kc:
    result = kubectl("get", "nodes")
# kubeconfig is cleaned up here regardless of what happened inside
```

---

## Part 3: SRE-Specific Tools (Advanced)

### Kubernetes Event Monitor

```python
#!/usr/bin/env python3
"""
Watch Kubernetes events and report warnings by namespace.
Demonstrates: subprocess, JSON parsing, collections, structured output.
"""
import argparse
import collections
import json
import logging
import subprocess
import sys
from dataclasses import dataclass
from typing import Iterator

@dataclass
class K8sEvent:
    namespace: str
    name: str
    reason: str
    message: str
    count: int
    kind: str

def get_events(namespace: str = "--all-namespaces") -> list[dict]:
    cmd = ["kubectl", "get", "events", namespace, "-o", "json"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)["items"]

def parse_warnings(events: list[dict]) -> Iterator[K8sEvent]:
    for e in events:
        if e.get("type") != "Warning":
            continue
        meta = e["metadata"]
        yield K8sEvent(
            namespace=meta.get("namespace", "default"),
            name=meta.get("name", ""),
            reason=e.get("reason", "Unknown"),
            message=e.get("message", ""),
            count=e.get("count", 1),
            kind=e.get("involvedObject", {}).get("kind", ""),
        )

def summarize(events: Iterator[K8sEvent]) -> dict:
    by_ns = collections.defaultdict(collections.Counter)
    for event in events:
        by_ns[event.namespace][event.reason] += event.count
    return dict(by_ns)

def main() -> int:
    parser = argparse.ArgumentParser(description="Kubernetes warning event summarizer")
    parser.add_argument("-n", "--namespace", default="--all-namespaces")
    parser.add_argument("--top", type=int, default=10)
    args = parser.parse_args()

    try:
        raw_events = get_events(args.namespace)
    except subprocess.CalledProcessError as e:
        logging.error("kubectl failed: %s", e.stderr)
        return 1
    except json.JSONDecodeError as e:
        logging.error("Failed to parse kubectl output: %s", e)
        return 1

    summary = summarize(parse_warnings(raw_events))

    for namespace, reasons in sorted(summary.items()):
        print(f"\n{namespace}:")
        for reason, count in reasons.most_common(args.top):
            print(f"  {reason:30s} {count:5d}")

    return 0

if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    sys.exit(main())
```

### Retry Decorator

```python
import functools
import logging
import random
import time
from typing import Callable, Tuple, Type, TypeVar

F = TypeVar("F", bound=Callable)

def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
) -> Callable[[F], F]:
    """
    Retry decorator with full-jitter exponential backoff.
    
    Usage:
        @retry(max_attempts=5, exceptions=(IOError, TimeoutError))
        def connect_to_db():
            ...
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc: Optional[Exception] = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt == max_attempts - 1:
                        break
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, delay)
                    logging.warning(
                        "%s attempt %d/%d failed (%s). Retry in %.1fs",
                        func.__name__, attempt + 1, max_attempts, e, jitter
                    )
                    time.sleep(jitter)
            raise last_exc  # type: ignore
        return wrapper  # type: ignore
    return decorator
```

### Parallel Health Checks

```python
import concurrent.futures
import logging
from typing import NamedTuple

class CheckResult(NamedTuple):
    host: str
    healthy: bool
    latency_ms: float
    error: str = ""

def check_host(host: str, port: int = 443, timeout_s: float = 5.0) -> CheckResult:
    import socket
    start = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            latency_ms = (time.monotonic() - start) * 1000
            return CheckResult(host=host, healthy=True, latency_ms=latency_ms)
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        latency_ms = (time.monotonic() - start) * 1000
        return CheckResult(host=host, healthy=False, latency_ms=latency_ms, error=str(e))

def check_all_hosts(hosts: list[str], port: int = 443, workers: int = 10) -> list[CheckResult]:
    """Check multiple hosts in parallel."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(check_host, h, port): h for h in hosts}
        results = []
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                host = futures[future]
                logging.error("Unexpected error checking %s: %s", host, e)
                results.append(CheckResult(host=host, healthy=False, latency_ms=0, error=str(e)))
    return sorted(results, key=lambda r: r.host)
```

---

## Part 4: Testing Your SRE Tools

```python
import pytest
from unittest.mock import patch, MagicMock

# Test the health checker
def test_check_host_success():
    with patch("socket.create_connection") as mock_conn:
        mock_conn.return_value.__enter__ = MagicMock()
        mock_conn.return_value.__exit__ = MagicMock(return_value=False)
        result = check_host("web-01", port=80)
    assert result.healthy is True
    assert result.error == ""

def test_check_host_timeout():
    import socket
    with patch("socket.create_connection", side_effect=socket.timeout("timed out")):
        result = check_host("web-01", port=80)
    assert result.healthy is False
    assert "timed out" in result.error

# Test retry decorator
def test_retry_success_on_third_attempt():
    call_count = 0
    
    @retry(max_attempts=3, base_delay=0.01)
    def flaky():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise IOError("not yet")
        return "success"
    
    result = flaky()
    assert result == "success"
    assert call_count == 3
```

---

## Points to Remember

- `time.monotonic()` for latency measurement — immune to clock changes
- Full jitter backoff: `random.uniform(0, delay)` — prevents thundering herd
- Use list args in `subprocess.run()` — never `shell=True` with user input
- `@dataclass` for structured data — cleaner than plain dicts, self-documenting
- Context managers (`with`) for resources — guarantees cleanup even on exceptions
- `concurrent.futures.ThreadPoolExecutor` for parallel I/O — network calls, not CPU work
- `pathlib.Path` over `os.path` — modern, readable, OS-independent
- Always provide `timeout` on network calls — never block indefinitely
- Exit code 0 = success, non-zero = failure — composable in shell pipelines

## What to Study Next

- [03-bash-and-shell-scripting.md](./03-bash-and-shell-scripting.md) — when Bash is better than Python
- [nebius/05-coding-algorithms.md](../nebius/05-coding-algorithms.md) — Python in an interview setting
- Hands-on labs: [../hands-on-labs/python/](../hands-on-labs/python/)
