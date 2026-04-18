# SRE Challenges Workspace

This repository now has three separate working areas:

- `interview-prep/`
  Senior and staff-level SRE, platform, Linux, networking, Kubernetes, system design, CI/CD, observability, and interview practice.
- `mlops/`
  Separate MLOps learning material, Python notebooks, MLflow exercises, and runnable Python project examples.
- `aiops/`
  Separate AIOps implementation notes for AI-assisted alert enrichment, routing, and operational automation.

## Where To Start

If your immediate goal is interview preparation, start here:

- [`interview-prep/README.md`](interview-prep/README.md)

If you want the local documentation portal:

```bash
cd /Users/jithinpjoseph/Documents/GitHub/SRE-Challenges/prep-portal
npm start
```

The portal home page is now structured so you can enter one area at a time:

- Interview Prep
- MLOps
- AIOps

## Repo Layout

```text
SRE-Challenges/
  interview-prep/
  mlops/
  aiops/
  prep-portal/
```

## Notes

- `interview-prep/` stays separate from `mlops/` and `aiops/`.
- The portal is the cleanest way to navigate the repo.
- Python-related local artifacts, notebook checkpoints, caches, and virtual environments are now ignored at the repo root.
