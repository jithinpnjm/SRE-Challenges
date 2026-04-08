# Networking Lab 3: Routing, Filtering, And Packet Capture

## Scenario

A service times out from one source but works from another. You need to decide whether this is DNS, routing, or filtering.

## Learning Goal

Learn how network failures look different at different layers.

## Commands To Try

```bash
ip addr
ip route
ss -tan
curl -v http://host:port
traceroute host
tcpdump -i any host <ip>
iptables -L -n -v
nft list ruleset
```

## Tasks

1. Explain the difference between timeout, connection refused, and no route.
2. Explain what a firewall drop versus reject does to client symptoms.
3. Explain what you want to see in a packet capture for a normal TCP handshake.
4. Write a short decision tree for "why can host A reach the service but host B cannot?"

## Stretch

- explain how NAT or asymmetric routing complicates this picture
- explain why cloud firewalls can make host tools look misleading
