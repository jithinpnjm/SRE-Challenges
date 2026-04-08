# Beginner: Platform Components And App Flow

## Mentor Mode

Treat every platform component as part of a request path, not as a product flashcard.

For each one, ask:

- what traffic enters here
- what decision does this layer make
- what failure can this layer create
- what observability would expose that failure

This file helps you understand common building blocks that appear in SRE and platform interviews.

## Challenge 1: NGINX Reverse Proxy Basics

Scenario: NGINX sits in front of an API service.

Your task:

- explain what a reverse proxy does
- explain TLS termination, header forwarding, timeouts, and health checks
- explain where 502 and 504 errors can come from

Hints:

- think of client to proxy, then proxy to upstream as two separate hops
- a bad upstream can be healthy from the client’s view until proxy timeout expires

Useful commands:

```bash
curl -v https://service.example.com
nginx -t
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

## Challenge 2: API Gateway Versus Load Balancer

Your task:

- explain the difference between an API gateway and a load balancer
- explain when you need auth, rate limits, routing rules, and request transformation
- explain which layer usually owns retries and timeouts

## Challenge 3: Kafka And Pub/Sub Warm-Up

Your task:

- explain producer, broker, topic, partition, consumer group, offset
- explain how Pub/Sub is conceptually similar and different
- explain why lag matters operationally

Hints:

- focus on delivery model, ordering, replay, and scaling

## Challenge 4: Cloud Run And Functions

Your task:

- explain what kinds of workloads fit Cloud Run or serverless functions
- explain cold starts, statelessness, scaling behavior, and timeout constraints
- explain when Kubernetes is a better fit

## Challenge 5: Cloud SQL Basics

Your task:

- explain why managed SQL is convenient
- explain connection management, failover, backups, and migration concerns
- explain why a stateless app can still fail if database connection handling is weak

## Challenge 6: Complete App Flow

Scenario: User opens an app that calls an HTTPS API, which reads from cache, then Cloud SQL, and also publishes an event.

Your task:

- walk through the full request path end to end
- identify likely latency contributors
- identify where you would add observability

Mentor hints:

- if you can narrate the full app flow, platform design questions become much easier
