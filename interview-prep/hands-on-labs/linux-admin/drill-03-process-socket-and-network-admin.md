# Linux Admin Drill 3: Processes, Sockets, And Basic Network Administration

## Goal

Get fluent at connecting processes to sockets and routes.

## Scenario

A service should be listening on a port, but clients time out.

## Tasks

1. Confirm whether the process is running.
2. Confirm whether it is listening and on which address.
3. Confirm local routing and interface state.
4. Explain one case where the process is healthy but clients still fail.
5. Explain one case where clients can connect locally but not remotely.

## Commands To Practice

```bash
ps aux
ss -lntp
ss -tanp
lsof -i
ip addr
ip route
iptables-save
nft list ruleset
```

## Model-Answer Rubric

- does the answer separate process state, listen state, and path reachability
- does it identify where policy might block traffic
- does it explain binding-to-localhost versus binding-to-all-interfaces risk
