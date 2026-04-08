# Cloud Design Lab 3: AWS Crossover Rebuild

## Scenario

Take the GCP-first public platform from Lab 1 and rebuild it for AWS-first operation.

Requirements:

- Route 53
- CloudFront if justified
- WAF
- ALB or NLB as justified
- EKS or an alternative compute platform
- private database
- queue or pub-sub equivalent
- CloudWatch and centralized observability
- security groups and NACL reasoning

## Your Task

Write and sketch:

1. GCP to AWS mapping
2. what maps directly
3. what does not map directly
4. how VPC, SG, and NACL design affects your architecture
5. what changes in load balancer and edge behavior
6. what remains architecturally identical despite product differences

## Interviewer Pressure Questions

- where are SGs enough and where do NACLs matter
- what if you copied GCP firewall habits into AWS without adapting
- what if ALB health checks are green but user requests fail

## Deliverable

- mapping table
- architecture sketch
- risk list for naive cloud portability

## Model-Answer Rubric

- mapping quality: does the answer distinguish rough equivalence from real parity
- networking realism: are VPC, SG, and NACL differences handled correctly
- edge behavior: are Route 53, WAF, ALB or NLB, and CloudFront choices justified
- portability judgment: does the answer avoid fake symmetry
- risk awareness: does it call out cloud-specific traps clearly

Strong answer signs:

- does not flatten GCP and AWS into generic boxes
- shows where native design should remain native
