# Networking Lab 2: SSH Latency Drill

## Scenario

SSH to a host feels slow. You want to place the delay in the exact phase of the flow.

## Learning Goal

Use protocol flow to drive troubleshooting.

## How To Think

SSH login typically involves:

1. DNS lookup
2. TCP connect to port 22
3. SSH protocol negotiation
4. authentication
5. shell startup

If you can tell which phase is slow, the search space shrinks fast.

## Commands To Try

```bash
ssh -vvv user@host
time ssh user@host true
dig host
ss -tanp | grep :22
tcpdump -i any port 22
```

## Tasks

1. Write what each SSH debug phase means.
2. List three causes of delay before authentication.
3. List three causes of delay after authentication.
4. Explain how reverse DNS can affect SSH experience.
5. Write the exact incident note you would send after confirming the delay is in auth, not TCP connect.

## Paper Variant

If you do not have a host to SSH into, narrate how you would isolate the delay from logs, `ssh -vvv`, and packet capture alone.
