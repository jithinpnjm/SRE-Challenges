# Foundations: Networking Fundamentals For Senior And Staff-Level SRE Interviews

This is not a memorization sheet. This is a field guide for thinking clearly when packets are delayed, dropped, misrouted, or rejected.

Networking becomes easier when you stop seeing it as invisible magic and start seeing it as a journey with checkpoints.

---

## What This Foundation Must Help You Do

By the end of this guide, you should be able to:

- explain packet flow from client to backend
- distinguish DNS, routing, TCP, TLS, HTTP, firewall, and application failures
- debug slow, refused, timed-out, or intermittent connections
- reason about cloud and Kubernetes networking without guessing
- answer networking interviews with a structured path, not vague phrases

---

## Memory Palace: Networking Is A Hotel Guest Journey

Imagine a guest trying to reach a room in a large hotel.

| Networking concept | Hotel analogy | Production meaning |
|---|---|---|
| DNS | Front desk directory | Name to IP lookup |
| IP address | Room number | Destination address |
| Port | Specific room door | Application listener |
| Route | Hallway/elevator path | Next-hop decision |
| ARP / neighbor | Finding the next hallway door | Local next-hop resolution |
| Firewall | Security guard | Policy allow/deny |
| TCP handshake | Guest knocks, room answers, guest confirms | Transport setup |
| TLS | ID check and private conversation | Secure session |
| HTTP | Guest request | Application protocol |
| Load balancer | Concierge assigns an available room | Backend selection |
| Timeout | Guest gives up waiting | Delay or packet loss |
| Reset | Door slammed shut | Active rejection / closed connection |

### Story: The Guest Cannot Reach Room 443

Do not immediately blame the security guard.

Ask:

1. Did the guest know the hotel address? DNS.
2. Did they reach the building? IP reachability.
3. Did they find the right hallway? Routing.
4. Was the door open? Listening port.
5. Did security block them? Firewall or policy.
6. Did ID verification fail? TLS.
7. Did the room answer incorrectly? HTTP/application.

Technical translation:

- DNS success does not prove TCP success.
- TCP success does not prove TLS success.
- TLS success does not prove HTTP/application health.
- A timeout, refusal, and reset are different failure types.

---

## Senior Mental Model

When someone says “the network is broken,” translate that into a packet journey.

Ask five questions:

1. Who is sending the traffic?
2. What exact destination is being reached?
3. What is the first failing checkpoint: DNS, route, TCP, TLS, proxy, or backend?
4. Is the failure broad or scoped to one node, subnet, AZ, region, namespace, or client?
5. Is this reachability, latency, loss, policy, overload, or application behavior?

A senior answer names the first failing hop.

---

## Fast Triage Flow

## 1. Split The Symptom

| Symptom | Likely first area |
|---|---|
| `NXDOMAIN` | DNS name does not exist |
| DNS timeout | Resolver path or upstream DNS |
| `No route to host` | Routing / local host path |
| `Connection refused` | Destination reached, port closed |
| Connection timeout | Drop, firewall, route, or no response |
| TLS certificate error | TLS identity / trust / SNI |
| HTTP 502 | Proxy cannot reach upstream |
| HTTP 504 | Proxy reached upstream but timed out |
| Only first request slow | DNS, TCP, TLS, cold connection |
| Only new connections fail | backlog, conntrack, ephemeral ports, NAT |

## 2. Draw The Path

For `https://api.example.com`, the path may be:

1. client resolver
2. local DNS cache
3. recursive DNS
4. authoritative DNS
5. TCP connect to edge IP
6. TLS handshake
7. CDN/WAF/load balancer
8. reverse proxy or ingress
9. service backend
10. cache, queue, or database dependency

If you cannot draw the path, you are guessing.

## 3. Test Each Checkpoint

```bash
dig api.example.com
ip route get 1.2.3.4
nc -vz api.example.com 443
curl -vk https://api.example.com
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' -o /dev/null -s https://api.example.com
```

What this tells you:

- `dig` tests name lookup
- `ip route get` tests route selection
- `nc` tests TCP reachability
- `curl -v` tests TLS and HTTP behavior
- `curl -w` splits latency by phase

---

## Command Interpretation Table

| Command | What it answers | Bad signs | Next step |
|---|---|---|---|
| `dig host` | Does DNS resolve? | timeout, NXDOMAIN, wrong IP | compare resolver / trace |
| `getent hosts host` | What does the OS resolver see? | differs from `dig` | inspect `/etc/resolv.conf`, NSS |
| `ip route get IP` | Which route will be used? | wrong interface/gateway | inspect routes/rules |
| `ss -lntp` | Is service listening? | missing port, localhost-only bind | inspect service config |
| `ss -tanp` | What socket states exist? | many SYN_SENT, CLOSE_WAIT | check reachability/app cleanup |
| `curl -vk URL` | Does TLS/HTTP work? | cert, SNI, 502/504 | inspect proxy/backend |
| `tcpdump` | What packets actually move? | SYN no SYN-ACK, resets | locate drop/reject point |
| `conntrack -S` | Is state table healthy? | insert_failed, drop | increase table / reduce churn |

---

## Core Concepts You Must Own

## DNS: The Front Desk Directory

DNS answers: “Where is this service?”

Useful commands:

```bash
cat /etc/resolv.conf
resolvectl status
dig api.example.com
dig +trace api.example.com
dig @8.8.8.8 api.example.com
getent hosts api.example.com
```

Common failure patterns:

- one node has bad resolver config
- internal names fail because DNS forwarding is broken
- stale cache sends clients to old backends
- low TTL or missing cache overloads resolvers

## Routing: Hallways And Elevators

Routing answers: “Which path should the packet take next?”

```bash
ip addr
ip route
ip rule
ip route get 8.8.8.8
traceroute example.com
mtr -rw example.com
```

Senior habit: always think about the return path too.

## TCP: Knock, Answer, Confirm

TCP setup:

1. SYN
2. SYN-ACK
3. ACK

```bash
ss -tanp
ss -s
tcpdump -ni any 'tcp port 443'
```

Key states:

- `SYN_SENT`: client waiting for answer
- `SYN_RECV`: server waiting for final ACK
- `ESTABLISHED`: data can flow
- `CLOSE_WAIT`: app has not closed after remote side ended
- `TIME_WAIT`: normal close protection, but can matter at high churn

## TLS: ID Check And Private Conversation

TLS can fail even when TCP works.

```bash
openssl s_client -connect example.com:443 -servername example.com
curl -vk https://example.com
```

Common causes:

- expired certificate
- wrong hostname/SNI
- missing intermediate CA
- mTLS mismatch
- proxy terminates TLS incorrectly

## Load Balancers And Proxies: The Concierge

A load balancer chooses a backend and may also terminate TLS, check health, reuse connections, or enforce policy.

Common proxy status codes:

- `502`: upstream connect failed or invalid response
- `504`: upstream timed out
- `499`: client disconnected before response completed

```bash
curl -I https://example.com
curl -v https://example.com/health
ss -lntp
journalctl -u nginx
```

## Firewalls, NAT, And Conntrack: Security And Guest Logs

Security groups, NACLs, iptables/nftables, and conntrack affect whether new flows are allowed and tracked.

```bash
iptables-save
nft list ruleset
conntrack -S
sysctl net.netfilter.nf_conntrack_max
```

Remember:

- stateful firewalls allow return traffic for established flows
- stateless filters require both directions
- NAT can run out of ephemeral ports
- conntrack exhaustion often breaks only new connections

---

## Real Incident Stories

## Scenario 1: HTTPS Is Slow From One Office

Wrong assumption: the API is slow.

Better path:

1. compare DNS answers from affected and unaffected networks
2. measure `curl -w` timings
3. check TLS handshake latency
4. compare route/MTR output
5. inspect CDN/LB regional routing

Likely causes:

- bad edge selection
- packet loss on one ISP path
- DNS resolver returning a distant endpoint
- MTU or retransmission issue

## Scenario 2: Service Is Running But Connection Is Refused

Wrong assumption: firewall blocked it.

Better path:

```bash
ss -lntp
curl -v localhost:PORT
ip addr
```

Likely causes:

- service not listening on that port
- bound to `127.0.0.1` only
- wrong container or host port mapping

## Scenario 3: Only New Connections Fail During A Spike

Wrong assumption: app is down.

Better path:

```bash
ss -s
ss -tan state syn-recv
conntrack -S
netstat -s
```

Likely causes:

- listen backlog saturation
- conntrack exhaustion
- NAT ephemeral port exhaustion
- SYN flood / incomplete handshakes

---

## Kubernetes And Cloud Connection

Networking fundamentals show up everywhere:

- Kubernetes Service debugging is DNS + virtual IP + backend endpoint selection.
- Ingress debugging is DNS + LB + proxy + Service + Pod readiness.
- Cloud networking is route tables + security policy + NAT + load balancer behavior.
- Service mesh adds identity, mTLS, retries, circuit breaking, and proxy telemetry.

If you can explain the hotel journey, you can explain most production packet paths.

---

## Hands-On Drill

Use `curl -w` to split request latency:

```bash
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' -o /dev/null -s https://example.com
```

Then explain:

- Which number shows DNS delay?
- Which number shows TCP connect delay?
- Which number shows TLS handshake delay?
- Which number shows server-side/proxy/backend delay?

---

## Interview Answer Shape

If asked, “How would you debug intermittent API latency?” a strong answer is:

> I would first draw the request path from client through DNS, TCP connect, TLS, edge or load balancer, proxy, backend, and downstream dependencies. Then I would split latency by phase using resolver checks and `curl -w`. If the delay appears before connect, I investigate DNS or routing. If connect is slow, I look for packet loss, firewall, backlog, or conntrack. If TLS or TTFB is slow, I move toward proxy, backend, or dependency saturation. I would avoid saying “network issue” until I can name the first failing hop.

---

## Recall Prompts

- In the hotel model, what is DNS?
- What is the difference between connection refused and connection timeout?
- Why can TCP work while TLS fails?
- What does HTTP 502 usually mean at a proxy?
- Why do only new connections fail when conntrack is exhausted?

---

## What To Study Next

- [Cloud networking and Kubernetes networking](./11-cloud-networking-and-kubernetes-networking.md)
- [HTTP, APIs, and reverse proxy paths](./22-http-apis-and-reverse-proxy-paths.md)
- [AWS cloud services and platform design](./14-aws-cloud-services-and-platform-design.md)
