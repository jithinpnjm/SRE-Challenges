# Beginner: Bash, Python, And Automation

## Mentor Mode

Readable automation beats clever automation.

Your script should make these things obvious:

- inputs
- failure behavior
- timeouts
- useful output
- exit codes

## Challenge 1: Write A Host Check Script

Task:

- write a Bash script that pings or TCP-checks a list of hosts
- print pass or fail per host
- return non-zero if any host fails

Hints:

- start with one host
- add loop logic after the single-host version works

## Challenge 2: Parse Logs With Shell

Task:

- count 5xx responses in an access log
- print top three client IPs causing 5xx

Useful commands:

```bash
awk
sort
uniq -c
grep
cut
```

## Challenge 3: Python HTTP Probe

Task:

- write a Python script that checks several URLs and reports status and latency
- handle timeout cleanly
- keep output readable

Mentor tip:

- in interviews, readable code beats clever code

## Challenge 4: JSON Parsing

Task:

- take a JSON response from a cloud API
- extract the fields you care about
- print them in a clean table or summary

Hints:

- start with `jq` if the problem is shell-first
- use Python if the logic grows
