# Hands-On Labs

This area turns the interview prep pack into practice you can actually run.

## Lab Tracks

- [linux/README.md](linux/README.md)
- [networking/README.md](networking/README.md)
- [kubernetes/README.md](kubernetes/README.md)
- [bash/README.md](bash/README.md)
- [python/README.md](python/README.md)
- [cloud-design/README.md](cloud-design/README.md)

## How To Work These Labs

For each lab:

1. Read the scenario and do not jump to commands immediately.
2. Write down the expected flow first.
3. Run only the minimum commands needed to confirm or reject your theory.
4. Capture your findings in a short note.
5. Ask me for hints if you want to stay unsolved.

## Suggested Order

1. Linux Lab 1
2. Networking Lab 1
3. Bash Lab 1
4. Python Lab 1
5. Kubernetes Lab 1
6. Then continue by topic depth
7. Then start the Cloud Design labs and use me as reviewer

## Optional Local Tooling

These labs are designed to be useful even as paper exercises, but they become much stronger if you can run some of them locally with:

- Docker
- `kubectl`
- a local Kubernetes cluster such as `kind` or `minikube`
- standard Linux tools such as `ss`, `ip`, `curl`, `dig`, `tcpdump`, `journalctl`

## Where To Simulate And Run Things

Official setup and practice links:

- Kubernetes tools: https://kubernetes.io/docs/tasks/tools/
- `kubectl` install: https://kubernetes.io/docs/tasks/tools/install-kubectl-macos/
- `kind` quick start: https://kind.sigs.k8s.io/docs/user/quick-start/
- `minikube` start: https://minikube.sigs.k8s.io/docs/commands/start/
- `minikube` handbook: https://minikube.sigs.k8s.io/docs/handbook/
- Docker install: https://docs.docker.com/get-docker/
- Docker Desktop for Mac: https://docs.docker.com/desktop/setup/install/mac-install/

Cloud and managed-service simulation or hands-on docs:

- GCP networking diagnostics with Connectivity Tests: https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/overview
- GCP Connectivity Tests how-to: https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Google Cloud free trial: https://cloud.google.com/free
- AWS getting started: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/setting-up-route-53.html

Mentor tip:

- use local clusters for Kubernetes object behavior and node-level thinking
- use cloud docs and trial accounts for managed-service behavior, IAM, networking, load balancing, and end-to-end architecture drills

## Mentor Rule

If a lab feels hard, that is expected. Use the matching foundation guide first:

- [../foundations/01-networking-fundamentals.md](../foundations/01-networking-fundamentals.md)
- [../foundations/02-linux-kubernetes-foundations.md](../foundations/02-linux-kubernetes-foundations.md)
- [../foundations/03-bash-and-shell-scripting.md](../foundations/03-bash-and-shell-scripting.md)
- [../foundations/04-python-for-sre.md](../foundations/04-python-for-sre.md)
