# Beginner: How To Think Like An SRE

This is your mentor note for the beginner track.

## Golden Pattern

When you see a problem:

1. Restate the symptom clearly.
2. Ask what changed.
3. Draw the flow of the request or process.
4. Split the problem into layers.
5. Use one command to confirm or reject each theory.

## SSH Example

Symptom: SSH is slow.

Think:

- what happens when I SSH?
- name resolution
- TCP connect to port 22
- SSH protocol negotiation
- authentication
- shell startup

Once you know the flow, you know where to look.

Useful commands:

```bash
ssh -vvv user@host
time ssh user@host true
dig host
ss -tan | grep :22
journalctl -u sshd
```

## Your Goal At Beginner Level

- stop guessing
- learn to narrate the system flow
- learn 10 to 20 commands that solve most first-pass debugging tasks
