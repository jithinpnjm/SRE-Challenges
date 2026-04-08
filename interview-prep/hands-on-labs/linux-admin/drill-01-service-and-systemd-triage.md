# Linux Admin Drill 1: Service And systemd Triage

## Goal

Be able to diagnose a failing service without guessing.

## Scenario

A service is reported unhealthy after a deploy. You only have host access.

## Tasks

1. Check service status and explain what the unit state means.
2. Pull the last 100 relevant log lines.
3. Identify whether the service failed to start, started and exited, or is running but unhealthy.
4. Identify one likely dependency issue and one likely application issue.
5. Write a short incident note.

## Commands To Practice

```bash
systemctl status <unit>
systemctl show <unit>
systemctl list-units --type=service
journalctl -u <unit> -n 100
journalctl --since "15 minutes ago"
ss -lntp
```

## Model-Answer Rubric

- does the answer distinguish unit state from application health
- does it use logs with a clear time window
- does it name the next validation step instead of guessing root cause
