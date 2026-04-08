# Linux Lab 1: First 10 Minutes On A "Slow Host"

## Scenario

You are told only this: "the host is slow."

Your job is to produce a 10-minute triage plan and then execute it on any Linux machine you have access to, or treat it as a paper drill if you cannot run commands.

## Learning Goal

Build a repeatable first-response sequence.

## How To Think

Do not start by guessing CPU. "Slow" could mean:

- CPU saturation
- memory pressure
- disk stalls
- network waits
- hung dependency
- bad process behavior

Ask yourself:

1. Is the host busy computing, blocked on IO, or waiting on the network?
2. Is one process responsible or is the whole system unhealthy?
3. Is the issue current or historical?

## Commands To Try

```bash
uptime
w
top
free -m
vmstat 1 5
df -h
df -i
iostat -xz 1 5
ss -tanp
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
journalctl -p err -n 50
```

## Tasks

1. Write what each command is intended to prove or disprove.
2. Run the commands in an order you think is efficient.
3. Summarize the machine state in five lines as if updating an incident channel.
4. Name three follow-up commands you would use if the issue looked CPU-heavy.
5. Name three follow-up commands you would use if the issue looked IO-heavy.

## Deliverable

Create a note with:

- your command order
- one sentence per command saying why it belongs there
- a final hypothesis tree

## Reflection

- which commands gave the most signal quickly
- what did you learn that you would now check earlier next time
