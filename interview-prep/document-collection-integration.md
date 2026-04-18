# Document Collection Integration

This file explains how the large `docs/` archive maps into the interview-prep system.

## Confirmed Duplicate Cleanup Targets

These are the obvious duplicate files I identified first:

- `docs/Kubernetes/1741330786433 (1).pdf`
- `docs/Kubernetes/1742254319349 (1).pdf`
- `docs/Terraform/1742484778408 (1).pdf`
- `docs/Interview Ouestions/AWS-Jithin-Questions.zip`
- `docs/.DS_Store`

The first three are duplicate copy files. The zip file duplicates extracted interview-question material that already exists in the repo tree.

## What The Archive Adds

The archive is strongest in:

- Linux and shell administration
- networking and load balancing
- Kubernetes
- AWS and Terraform
- CI/CD tooling such as Jenkins, GitHub Actions, ArgoCD, and SonarQube
- Python and scripting
- Prometheus and Grafana
- interview question banks across Linux, DevOps, Kubernetes, AWS, Docker, Jenkins, Terraform, and Python

That makes it a strong reinforcement library, but not a replacement for the interview-prep pack.

## Topic Concentration

High-signal folders by volume:

- `Kubernetes`
- `Interview Ouestions`
- `Devops Basics`
- `AWS`
- `Linux`
- `Docker`
- `Ansible`
- `Terraform`
- `Networking`
- `Jenkins`

This is exactly the kind of topic spread that should enrich interview prep through structured topic routes instead of raw file browsing.

## How To Use It Correctly

Use this order:

1. [foundations/](foundations/) — the primary study guides for all topics
2. [hands-on-labs/](hands-on-labs/) — practical exercises
3. [mock-interviews/](mock-interviews/) — practice scenarios
4. `docs/` archive — only as supplemental reinforcement for weak areas

The `docs/` archive contains raw PDFs and reference material. Use it when you want additional worked examples or vendor-specific documentation on a topic you've already covered in the foundations.

## Important Constraint

Most files in `docs/` are binary PDFs, images, gifs, and archives. In this environment I can reliably:

- categorize them
- spot obvious duplicates
- use their topic distribution and interview-question structure

But I cannot cleanly mine every PDF’s full text without a local PDF extraction tool.

So the enhancement work in the prep pack is based on:

- folder taxonomy
- repeated topic concentration
- interview-question-bank coverage
- overlap and gaps relative to the current prep system
