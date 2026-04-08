# Foundations: Linux And Network Administration For Senior SRE

This guide is for the part of the job that never stops mattering: Linux and network administration basics done well under pressure.

## Mentor Mode

You do not become "too senior" for Linux and network administration. The more senior you get, the more expensive shallow fundamentals become.

## Answer This In The Portal

- Draft your Linux admin answer here: [/workspace?challenge=Linux%20administration%20and%20host%20troubleshooting](/workspace?challenge=Linux%20administration%20and%20host%20troubleshooting)
- Use this structure while answering: [answers-template.md](../answers-template.md)
- Guided review flow: [interactive-study.mdx](../interactive-study.mdx)

Your mental model should always be able to answer:

- what process is running
- what resources it is consuming
- what filesystems and mounts it depends on
- what sockets it is listening on
- what route traffic takes
- what names it resolves
- what policy might block it

## Linux Administration Core Areas

You should be comfortable with:

- users, groups, permissions, sudo boundaries
- systemd units and logs
- processes and signals
- filesystems, mounts, and inodes
- package and service management
- kernel and host limits
- networking interfaces, routes, and DNS
- firewall and packet filtering
- performance basics

## Senior Linux Command Set

These should feel natural:

```bash
uname -a
hostnamectl
timedatectl
systemctl status <unit>
systemctl list-units --type=service
journalctl -u <unit>
journalctl -xe
ps aux
top
pidstat 1
free -m
vmstat 1
iostat -xz 1
df -h
df -i
findmnt
lsblk
ss -tanp
ip addr
ip route
resolvectl status
dig host
tcpdump -i any
iptables-save
nft list ruleset
```

## Systemd Thinking

When a service misbehaves, ask:

- is the unit failing or is the process inside it failing
- does the unit restart too aggressively
- are logs local and recent enough
- is the dependency chain broken

Useful commands:

```bash
systemctl status nginx
systemctl show nginx
journalctl -u nginx -n 100
journalctl --since "10 minutes ago"
```

## Filesystem Administration

Important habits:

- always check both bytes and inodes
- know what is mounted where
- understand whether a path is local disk, network mount, overlay, or ephemeral storage
- think about log growth and temp paths

## Network Administration Basics

Always be ready to reason about:

- interface state
- routing table
- neighbor table
- local listen sockets
- established sessions
- DNS resolver config
- firewall rules

Useful commands:

```bash
ip addr
ip route
ip neigh
ss -lntp
ss -s
resolvectl status
dig example.com
```

## Troubleshooting Patterns

### Service Unreachable

Ask:

- is the process listening
- is the route valid
- is DNS correct
- is a firewall blocking
- is the service bound to the wrong address

### Host Slow

Ask:

- CPU busy or waiting
- memory pressure or reclaim
- disk latency
- dependency wait
- one process or systemic issue

### DNS Weirdness

Ask:

- is resolution slow or wrong
- is only one node affected
- are search domains or resolver settings causing amplification

## Staff-Level Admin Habit

Every admin issue should end with:

- immediate fix
- durable prevention
- safer default
- better signal for earlier detection
