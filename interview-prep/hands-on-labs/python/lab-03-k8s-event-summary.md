# Python Lab 3: Kubernetes Warning Event Summary

## Goal

Turn noisy Kubernetes event output into something a responder can use quickly.

## Starter

Use [starter/k8s_event_summary.py](starter/k8s_event_summary.py).

## Tasks

1. Read JSON from `kubectl get events -A -o json`.
2. Filter Warning events.
3. Count by namespace and reason.
4. Print the top warning reasons.
5. Explain how this helps in a real cluster incident.
