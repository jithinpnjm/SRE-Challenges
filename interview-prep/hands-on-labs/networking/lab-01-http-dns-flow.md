# Networking Lab 1: HTTP, HTTPS, DNS, And Request Flow

## Scenario

An engineer says "the website is slow." Your first task is to break that vague statement into stages.

## Learning Goal

Understand where latency can live in a simple web request.

## How To Think

For `https://example.com`, think:

1. DNS resolution
2. TCP connect
3. TLS handshake
4. request sent
5. server processing
6. response transfer

## Commands To Try

```bash
dig example.com
curl -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} starttransfer=%{time_starttransfer} total=%{time_total}\n' -o /dev/null -s https://example.com
openssl s_client -connect example.com:443 -servername example.com
traceroute example.com
```

## Tasks

1. Run the timed `curl` command and explain each timing field.
2. Explain what would make DNS slow versus TLS slow.
3. Explain why the app can be healthy while the user still sees slowness.
4. Draw the full request path from your laptop to the backend.

## Reflection

- which timing field would change first if DNS broke
- which timing field would change first if backend processing became slow
