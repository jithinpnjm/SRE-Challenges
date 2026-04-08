# Linux Lab 2: Filesystem, Disk, And IO Pressure

## Scenario

An application logs "disk write timeout" but `df -h` still shows free space.

## Learning Goal

Understand why free space is not enough.

## How To Think

Possible causes include:

- inode exhaustion
- high IO wait
- filesystem latency
- page cache pressure
- noisy-neighbor disk contention

## Commands To Try

```bash
df -h
df -i
iostat -xz 1 5
vmstat 1 5
mount
findmnt
du -sh /var/log/* | sort -h | tail
```

## Tasks

1. Explain what `df -h` can tell you and what it cannot.
2. Explain what inode exhaustion would look like.
3. Explain what high `%util` or await in `iostat` suggests.
4. Identify one file path on your machine that is growing fastest.
5. Write a short incident update for "space is fine, disk is not fine."

## Stretch

- explain how disk pressure and memory pressure can amplify each other
- explain why container overlay filesystems can complicate disk reasoning
