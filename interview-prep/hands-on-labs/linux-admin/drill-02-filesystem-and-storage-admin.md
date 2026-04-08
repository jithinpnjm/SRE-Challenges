# Linux Admin Drill 2: Filesystem And Storage Administration

## Goal

Build confidence in diagnosing disk and filesystem problems.

## Scenario

A service reports write failures and latency spikes. Space looks available.

## Tasks

1. Check bytes and inodes.
2. Check mount layout.
3. Check IO latency indicators.
4. Identify one reason local disk can be healthy while the service still stalls.
5. Explain how overlay, temp storage, or network mounts change the picture.

## Commands To Practice

```bash
df -h
df -i
findmnt
lsblk
iostat -xz 1 5
du -sh /var/log/* | sort -h | tail
```

## Model-Answer Rubric

- does the answer go beyond free space
- does it check inode and mount behavior
- does it connect storage symptoms to application impact
