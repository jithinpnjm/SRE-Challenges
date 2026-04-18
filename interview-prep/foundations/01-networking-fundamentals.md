# Foundations: Networking Fundamentals For Senior And Staff-Level SRE Interviews

This is not a memorization sheet. This is a field guide for thinking clearly when packets are delayed, dropped, misrouted, or rejected.

If you want to become strong at Linux, cloud, Kubernetes, and production debugging, networking cannot remain a vague background skill. You need a stable mental model for how traffic actually moves.

## Mentor Mode

When networking feels hard, it is usually because the path is still fuzzy in your head.

Slow yourself down and ask:

1. Who is sending the traffic?
2. What exact destination is it trying to reach?
3. Is the first step name resolution, route selection, ARP, TCP handshake, TLS negotiation, or HTTP behavior?
4. At which hop does the symptom first appear?
5. Is the problem reachability, slowness, packet loss, policy, overload, or application behavior pretending to be a network issue?

That is how senior operators work. They convert a scary symptom into a packet journey with checkpoints.

## Answer This In The Portal

- Draft your networking answer here: [/workspace?challenge=Packet%20flow%20from%20client%20to%20backend](/workspace?challenge=Packet%20flow%20from%20client%20to%20backend)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

## How To Think About Any Network Problem

Use this triage frame before you reach for commands:

### Step 1: Draw The Path

If a user says "`https://api.example.com` is slow", the path may be:

1. browser or client resolver
2. local DNS cache
3. recursive DNS
4. authoritative DNS
5. TCP connect to edge IP
6. TLS handshake
7. CDN, WAF, or edge load balancer
8. reverse proxy or ingress
9. service backend
10. cache, queue, or database dependencies

If you cannot draw the path, you are guessing.

### Step 2: Split The Problem Type

Ask which bucket fits best:

- no resolution
- no route
- connection refused
- connection timeout
- handshake failure
- intermittent reset
- only first request is slow
- only cross-region traffic is slow
- only one subnet, node, or AZ is affected
- only one app protocol is affected

### Step 3: Identify Which Layer First Shows Pain

For operators, a practical model is:

- L2: adjacency, ARP, MAC, VLAN
- L3: IP, subnet, route, gateway
- L4: TCP or UDP transport, retransmissions, backlog, conntrack
- L5-L7: TLS, DNS, HTTP, gRPC, application protocol behavior

Senior interview rule:

- do not stop at “layer 7”
- explain how lower-layer behavior creates upper-layer symptoms

## What Actually Happens On The Wire

### ARP And Local Delivery

Before an IP packet is delivered on the local network, the sender often needs the MAC address for the next hop.

That means:

- same-subnet traffic may require ARP for the remote host
- off-subnet traffic usually requires ARP for the default gateway
- stale or missing neighbor entries can create delay before the application sees a timeout

Useful commands:

```bash
ip neigh
arp -an
ip addr
ip route
```

Think like this:

- if the host cannot even resolve the next-hop MAC, TCP and HTTP are not the real first problem

### Routing

Routing chooses the next hop based on destination. It does not prove the destination app is healthy.

Core concepts to own:

- longest prefix match
- default route
- policy routing
- asymmetric return paths
- route tables versus firewall behavior

Useful commands:

```bash
ip route
ip rule
ip route get 8.8.8.8
traceroute example.com
mtr -rw example.com
```

Senior answer habit:

- always ask about return path, not just forward path

## TCP The Way Operators Need To Understand It

### The Handshake

TCP setup is:

1. client sends SYN
2. server replies SYN-ACK
3. client replies ACK

If SSH or HTTPS is “hanging”, ask:

- was DNS slow before the connect started
- is SYN leaving the client
- is SYN-ACK returning
- is something silently dropping instead of rejecting
- is the server accept queue saturated
- is stateful filtering or conntrack involved

Useful commands:

```bash
ss -tanp
ss -s
tcpdump -ni any 'tcp port 22'
tcpdump -ni any 'tcp port 443'
```

### Connection States That Matter

Important TCP states:

- `SYN_SENT`: client sent SYN, still waiting
- `SYN_RECV`: server saw SYN, still waiting for final ACK
- `ESTABLISHED`: data can flow
- `CLOSE_WAIT`: remote closed, local side still has work to do
- `TIME_WAIT`: connection is closed but kernel is protecting against old packets

What these states mean operationally:

- too many `SYN_SENT` sockets often points to reachability, filtering, or return-path issues
- too many `SYN_RECV` sockets often points to incomplete handshakes or flood pressure
- too many `CLOSE_WAIT` sockets often points to application shutdown bugs
- lots of `TIME_WAIT` is not always bad, but can matter at high connection churn

### Retransmissions And Tail Latency

Packets do not need to be fully dropped for users to feel pain.

Retransmissions can cause:

- high p95 and p99 latency
- bursty request slowdowns
- misleadingly normal CPU and memory
- app retries that multiply the load

Useful commands:

```bash
netstat -s
sar -n TCP,ETCP 1
ss -ti
```

## UDP, DNS, And “It Works Most Of The Time”

UDP changes the troubleshooting model:

- no handshake
- no guaranteed delivery
- application timeouts matter a lot
- loss often appears as partial or flaky behavior

This matters for:

- DNS
- some service discovery systems
- telemetry paths
- some streaming and realtime systems

Useful commands:

```bash
tcpdump -ni any udp
ss -uapn
dig example.com
```

## DNS For Senior Operators

### The Real Lookup Path

A name lookup may involve:

1. application resolver call
2. libc or local resolver library behavior
3. local cache or stub resolver
4. recursive DNS
5. authoritative DNS
6. TTL-based caching on multiple layers

If DNS is slow, your application is slow.

If DNS is wrong, your application may fail in ways that look random.

### DNS Failure Patterns To Recognize

- one node is slow because only that node has bad resolver config
- only internal names fail because internal DNS or forwarding is broken
- failover did not happen because clients cached longer than expected
- requests go to old backends because stale answers are still served
- high query load is self-inflicted by missing caching or very low TTL

Useful commands:

```bash
cat /etc/resolv.conf
resolvectl status
dig api.example.com
dig +trace api.example.com
dig @8.8.8.8 api.example.com
getent hosts api.example.com
```

### Mentor Example: Slow SSH

If someone says “SSH is slow”, do not jump straight to CPU or disk.

Think:

1. when you type `ssh host`, name resolution may happen first
2. then TCP port 22 connect happens
3. then SSH banner exchange and key negotiation happen
4. then authentication happens
5. then shell startup happens

So the delay could be:

- DNS
- route or packet loss
- TCP handshake
- reverse DNS on the server
- PAM or directory lookup
- shell startup scripts

Useful commands:

```bash
ssh -vvv user@host
time ssh -o PreferredAuthentications=publickey user@host exit
dig host.example.com
tcpdump -ni any 'port 22'
journalctl -u sshd
```

That is the style of reasoning interviewers want.

## HTTP And HTTPS Timing Model

For a request to `https://example.com`, separate:

- DNS lookup
- TCP connect
- TLS handshake
- request sent
- time to first byte
- response transfer

Useful commands:

```bash
curl -v https://example.com
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} start=%{time_starttransfer} total=%{time_total}\n' -o /dev/null -s https://example.com
openssl s_client -connect example.com:443 -servername example.com
```

### TLS Failure Modes

TLS can fail because of:

- certificate expiration
- wrong hostname or SNI
- missing intermediate certs
- proxy or load balancer mis-termination
- packet loss during handshake
- mTLS mismatch

Senior answer habit:

- distinguish transport connect from TLS negotiation

## NAT, Firewalls, Conntrack, And Why “Allowed” Does Not Mean Working

### NAT

NAT changes how flows look because source or destination IP and ports may be rewritten.

Operational consequences:

- server logs may not show the original client
- ephemeral port exhaustion can hurt outbound traffic
- state tracking matters

### Stateful Firewalls

Cloud security groups and host firewalls are often stateful.

That means:

- return traffic can be allowed automatically for established flows
- new incoming flows still require explicit allow rules

### Stateless Filters

Network ACLs and some routers are stateless.

That means:

- you must reason about both directions
- return path and ephemeral ports matter more explicitly

### Conntrack

Conntrack exhaustion can make a healthy-looking system reject or drop new flows.

Useful commands:

```bash
conntrack -S
sysctl net.netfilter.nf_conntrack_max
iptables-save
nft list ruleset
```

## Load Balancing And Reverse Proxy Thinking

### What A Load Balancer Really Does

A load balancer is not just “send requests to many servers.”

It also decides:

- which frontends listen
- which health checks determine backend readiness
- whether balancing is L4 or L7
- whether connection reuse changes traffic distribution
- where TLS is terminated
- whether stickiness or consistent hashing exists

### Reverse Proxy Thinking

Nginx, Envoy, HAProxy, ingress controllers, and cloud L7 load balancers can all become the first visible bottleneck.

Common reverse proxy symptoms:

- 502 because upstream connect failed
- 504 because upstream timed out
- 499 because client disconnected early
- only large requests fail because buffering or body limits are hit
- only some paths fail because route rules mismatch

Useful commands:

```bash
curl -I https://example.com
curl -v https://example.com/health
ss -lntp
journalctl -u nginx
```

## Cloud Networking: What Senior Answers Need

### AWS

You should be able to explain:

- VPC
- subnet purpose
- route tables
- internet gateway
- NAT gateway
- security groups
- network ACLs
- internal versus internet-facing load balancers

Critical distinction:

- security groups are stateful and attached to resources
- NACLs are stateless and attached to subnets

### GCP

You should be able to explain:

- global VPC model
- regional subnets
- firewall rules and policy
- Cloud DNS
- internal versus external load balancers
- Private Google Access and private service connectivity

### Common Cloud Interview Mistake

Candidates often list products without describing the actual traffic path.

A better answer is:

1. client resolves DNS
2. client reaches CDN or external LB
3. edge policy or WAF inspects
4. request goes to regional or zonal backend
5. backend reaches private services over internal network
6. egress is controlled and observable

## Linux Networking Commands You Should Be Comfortable With

### Reachability And Path

```bash
ping host
traceroute host
mtr -rw host
curl -v https://host
nc -vz host 443
```

### Local State

```bash
ip addr
ip route
ip neigh
ss -tulpn
lsof -i
```

### Name Resolution

```bash
dig host
dig +trace host
getent hosts host
cat /etc/resolv.conf
```

### Packet Capture

```bash
tcpdump -ni any port 53
tcpdump -ni any host 10.0.0.5
tcpdump -ni any 'tcp port 443'
```

Mentor note:

- do not run packet capture blindly
- start with a narrow filter tied to the symptom

## Staff-Level Troubleshooting Drills

### Drill 1: HTTPS Is Slow From One Office

Think:

- DNS response region
- internet path from that office
- TLS handshake RTT
- CDN edge selection
- MTU or packet loss on that path

### Drill 2: Only New Connections Fail During Traffic Spike

Think:

- listen backlog
- SYN queue pressure
- conntrack exhaustion
- load balancer health or surge behavior
- ephemeral port pressure on clients or NAT

### Drill 3: Only One Kubernetes Node Has DNS Timeouts

Think:

- node resolver config
- local DNS cache behavior
- iptables or eBPF dataplane difference
- CNI path
- packet loss or MTU issue on that node

## How To Sound Senior In Networking Interviews

Do this:

- narrate the packet path
- distinguish control-plane information from data-plane traffic
- explain which command would confirm each theory
- separate transport, TLS, and application latency
- mention return path and policy layers
- discuss blast radius and scope

Do not do this:

- say “network issue” without naming the hop
- jump to the app before proving transport is healthy
- confuse DNS, routing, and firewall failure
- treat load balancers as magic boxes

## What to Study Next

- [11-cloud-networking-and-kubernetes-networking.md](./11-cloud-networking-and-kubernetes-networking.md)
- [22-http-apis-and-reverse-proxy-paths.md](./22-http-apis-and-reverse-proxy-paths.md)
- [14-aws-cloud-services-and-platform-design.md](./14-aws-cloud-services-and-platform-design.md)

The raw source material came from the `docs/` archive across networking, load-balancing, proxy, and cloud folders, but this page is meant to be the readable operator layer.

## What Good Looks Like In An Interview

If someone asks, “How would you debug intermittent latency to an API?”, a strong answer sounds like this:

1. I would map the request path from client through DNS, connect, TLS, edge, proxy, backend, and downstreams.
2. I would split the latency into phases so I know whether this is pre-connect, connect, handshake, or server-side.
3. I would check if the issue is broad or scoped by source network, AZ, node, or protocol.
4. I would use `curl -w`, `dig`, `ss`, and targeted `tcpdump` to confirm where delay begins.
5. I would correlate that with load balancer health, backend saturation, and packet retransmission signals.
6. I would avoid proposing fixes until I can say which hop first became slow.

That is already much closer to staff-level thinking than a command dump.
