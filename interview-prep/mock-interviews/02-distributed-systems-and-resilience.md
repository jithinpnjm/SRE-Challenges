# Mock Interview 2: Distributed Systems, HA, Low Latency, And Resilience

Use this for 60-minute system design practice with SRE depth.

## Questions

1. Design a low-latency control-plane API used by many internal services across zones.
2. How would you detect and survive overload caused by a successful product launch?
3. What are the biggest causes of tail latency in distributed systems?
4. Compare active-active and active-passive for a service with strict availability goals.
5. When do retries help, and when do they make the incident worse?
6. How do you design observability for a system where the tracing backend itself can fail?
7. How would you choose between queueing, shedding, and backpressure?
8. Explain a safe failover decision when data consistency is uncertain.
9. How would you define SLOs for a control-plane service used by CI/CD systems?
10. What would you test in a game day before trusting this design?

## Follow-Up Pressure Questions

- what breaks first if one zone is lost
- what breaks first if latency doubles but capacity stays the same
- what breaks first if a dependency returns partial success
- what gets rolled back and what does not

## What Strong Answers Include

- requirements before architecture
- failure mode analysis before feature enthusiasm
- clear rollback, validation, and operator workflow
- acknowledgment of cost and complexity, not only reliability
