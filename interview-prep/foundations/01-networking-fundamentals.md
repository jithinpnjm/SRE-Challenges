# Foundations: Networking Fundamentals For Senior SRE And Platform Interviews

This guide is intentionally deeper than a normal interview cheat sheet. The point is not to memorize trivia. The point is to build a stable mental model you can reuse when a question gets messy.

## Mentor Mode

Networking becomes much easier once you stop thinking in terms of "commands to run" and start thinking in terms of "what exact trip is the packet trying to make."

## Answer This In The Portal

- Draft your networking answer here: [/workspace?challenge=Packet%20flow%20from%20client%20to%20backend](/workspace?challenge=Packet%20flow%20from%20client%20to%20backend)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

When a network problem appears, force yourself to answer these first:

1. What is the source?
2. What is the destination?
3. What name resolution happens first?
4. What protocol is really in use?
5. Which hop first fails or slows down?
6. Is the failure one-way, two-way, or only for new connections?
7. Is the issue reachability, negotiation, policy, congestion, or application behavior?

That habit is more important than any individual tool.

## The Layering Model That Actually Helps In Interviews

The full OSI model is useful, but for production troubleshooting this is usually enough:

- L2: local adjacency, MAC, VLANs, ARP
- L3: IP addressing, routing, subnets
- L4: TCP or UDP sessions, ports, retransmits, backlog
- L5 to L7: TLS, HTTP, gRPC, DNS, app protocol behavior

Senior interview tip:

- do not hide behind "it’s a layer 7 issue"
- show how lower layers can cause higher-layer symptoms

## Packet Journey: Internet To Backend

For a user opening `https://api.example.com/orders`, the path might be:

1. client checks local DNS cache
2. client queries recursive DNS
3. recursive DNS resolves authoritative answer
4. client opens TCP connection to returned IP
5. client performs TLS handshake
6. edge or cloud load balancer accepts connection
7. load balancer health and routing logic selects backend
8. request reaches reverse proxy or ingress
9. proxy forwards request to service
10. service may call cache, database, or queue
11. response goes back through the reverse path

Every step adds possible latency or failure.

## IP, Ports, And Sockets

Core facts:

- IP identifies the network endpoint
- port identifies the service on that endpoint
- a TCP connection is identified by source IP, source port, destination IP, destination port
- clients usually use ephemeral source ports

Interview traps:

- forgetting ephemeral ports when reasoning about firewall rules
- assuming one destination port means one connection path
- forgetting NAT can rewrite source addresses and ports

Useful commands:

```bash
ss -tanp
ss -tulpn
lsof -i
cat /proc/net/tcp
```

## TCP The Way Operators Need It

### Handshake

TCP connection establishment:

1. client sends SYN
2. server replies SYN-ACK
3. client replies ACK

If this is slow, ask:

- DNS delay before connect?
- SYN not reaching server?
- SYN-ACK not returning?
- listen backlog saturation?
- firewall silently dropping?

### Important States

- `SYN_SENT`: client sent SYN, waiting for SYN-ACK
- `SYN_RECV`: server received SYN, waiting for final ACK
- `ESTABLISHED`: normal data flow
- `FIN_WAIT*`: orderly shutdown in progress
- `CLOSE_WAIT`: peer closed, local side has not fully closed
- `TIME_WAIT`: connection closed, waiting to avoid old packets corrupting a later connection

Senior explanation standard:

- do not just define these states
- explain what many sockets in one state would mean operationally

### Retransmissions And Tail Latency

Retransmits matter because:

- user requests can succeed but become slow before total failure
- medians may look normal while p99 explodes
- retrying at the app layer can amplify existing packet loss

### Backlog, Accept Queue, And Connection Pressure

A service can be "up" but still fail new connections if:

- listen backlog is too small
- app is not accepting quickly enough
- SYN queue is pressured
- conntrack or NAT state is exhausted upstream

Useful commands:

```bash
ss -lnt
ss -s
netstat -s
sar -n TCP,ETCP 1
```

## UDP And Why It Changes The Debugging Game

UDP has:

- no handshake
- no built-in retransmission
- no delivery guarantee
- lower overhead

This means:

- drops may not look like connection failures
- application-level timeouts, retries, or sequencing matter more
- packet capture often becomes more important

## DNS For Operators

### Real Flow

Typical resolution path:

1. application resolver call
2. local stub resolver or libc behavior
3. node-level resolver or DNS cache
4. recursive resolver
5. authoritative DNS answer
6. client caches answer by TTL

### Production Lessons

- DNS latency shows up as app latency
- DNS misconfiguration can create selective failure by node or namespace
- stale records can route traffic to dead or old backends
- short TTL is not a magic failover switch if clients ignore or cache aggressively

### Debug Commands

```bash
dig api.example.com
dig +trace api.example.com
dig @8.8.8.8 api.example.com
resolvectl status
cat /etc/resolv.conf
```

### Senior DNS Questions To Practice

- what changes if only one node has slow lookups?
- what changes if only internal names fail?
- what changes if the answer is fast but wrong?

## HTTP, HTTPS, And TLS

### HTTP Breakdown

For a timed request, split latency into:

- DNS lookup
- TCP connect
- TLS handshake
- time to first byte
- response transfer time

### HTTPS Realities

TLS can fail or slow down because of:

- server certificate problems
- wrong SNI
- bad chain or CA trust
- expensive handshake load
- packet loss during handshake
- proxy or load balancer termination issues

Useful commands:

```bash
curl -v https://example.com
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} start=%{time_starttransfer} total=%{time_total}\n' -o /dev/null -s https://example.com
openssl s_client -connect example.com:443 -servername example.com
```

## Routing

Routing decides where packets go next, not whether the remote app is healthy.

Key ideas:

- destination-based routing is normal
- policy routing can override default route choice
- return path matters for stateful middleboxes and conntrack
- asymmetric routing may work or fail depending on the network path and filters

Useful commands:

```bash
ip addr
ip route
ip rule
ip neigh
traceroute example.com
mtr -rw example.com
```

## NAT And Conntrack

Many production failures are really state problems, not bandwidth problems.

NAT and conntrack matter because:

- each new connection may consume state
- bursts of short-lived connections can exhaust tables
- drops often hit new connections first while existing ones limp on
- Kubernetes nodes with heavy east-west and north-south traffic can hit conntrack pressure

Symptoms:

- intermittent timeout on connect
- sudden increase in SYN retransmits
- errors biased toward new outbound connections

Useful commands:

```bash
ss -s
cat /proc/sys/net/netfilter/nf_conntrack_max
conntrack -S
dmesg | grep -i conntrack
```

## MTU, Fragmentation, And PMTU

Suspect MTU or path MTU issues when:

- small requests work but large responses fail
- TLS or gRPC behaves inconsistently
- only some network paths are affected
- overlay or tunneling adds hidden header overhead

This is especially relevant in cloud networks, VPNs, and Kubernetes overlays.

Useful commands:

```bash
ip link
tracepath host
tcpdump -i any host <ip>
```

## Firewalls, ACLs, And Policy Layers

Filtering can happen at:

- host firewall
- cloud firewall or security group
- NACL
- load balancer policy
- Kubernetes NetworkPolicy
- service mesh or gateway policy

Important interview point:

- "connection refused" is not the same as "timeout"
- refuse usually means reachable host with closed port or active reject
- timeout often means drop, route problem, or deep dependency stall

Useful commands:

```bash
iptables -L -n -v
iptables-save
nft list ruleset
```

## Packet Capture And What You’re Trying To Prove

Do not run `tcpdump` just to say you did.

Ask what you want to prove:

- did SYN leave?
- did SYN-ACK return?
- are retransmits increasing?
- is MTU fragmentation visible?
- are resets coming from the service or somewhere else?

Useful commands:

```bash
tcpdump -i any host <ip>
tcpdump -i any port 443
tcpdump -nnvvXSs 0 host <ip>
```

## Linux Networking Concepts That Matter For Kubernetes

Kubernetes networking rests on Linux primitives:

- network namespaces
- veth pairs
- routes
- conntrack
- iptables, nftables, or eBPF dataplane logic

If you understand these, Kubernetes Service and Pod networking becomes much less mystical.

## Mentor Walkthrough: Slow SSH

Scenario: SSH is slow.

Think in phases:

1. name resolution
2. TCP connect
3. SSH negotiation and key exchange
4. authentication
5. shell startup

Questions to ask:

- does `time ssh host true` show delay before or after auth?
- does `ssh -vvv` stall during connect, auth, or session setup?
- is reverse DNS or PAM slow?
- is shell startup reading slow mounts or remote profiles?

Helpful commands:

```bash
ssh -vvv user@host
time ssh user@host true
dig host
dig -x <server-ip>
ss -tanp | grep :22
journalctl -u sshd
tcpdump -i any port 22
```

## Troubleshooting Matrices

### If TCP Connect Is Slow

Think about:

- DNS before connect
- routing
- firewall drop
- SYN retransmits
- conntrack pressure
- overloaded listener

### If Connect Is Fast But Request Is Slow

Think about:

- TLS handshake
- proxy queueing
- app thread pool or event loop pressure
- database latency
- lock contention
- retries to downstreams

### If Only Some Nodes Or Zones Fail

Think about:

- resolver differences
- route differences
- NetworkPolicy or firewall scope
- conntrack state on one node pool
- MTU mismatch on one path
- zonal dependency or load balancer target skew

## Senior Practice Drills

1. Explain why a healthy ping does not prove a healthy application path.
2. Explain why successful DNS does not prove the right backend is in use.
3. Explain why retransmits can raise p99 while throughput still looks acceptable.
4. Explain how NAT state exhaustion differs from bandwidth saturation.
5. Explain why large responses can fail before small responses when MTU is wrong.
6. Explain how a load balancer can say "healthy" while real users fail.
