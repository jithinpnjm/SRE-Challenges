# Cloud Networking Drill 1: Public, Private, And Internal Boundaries

## Goal

Be able to explain what should and should not be reachable from the internet.

## Scenario

Design a service that has:

- public API
- internal admin UI
- private database
- background workers

## Tasks

1. Draw the public boundary.
2. Draw the private application boundary.
3. Explain how admin access works safely.
4. Explain where egress is needed and how you would control it.
5. Explain which assets must never be public.

## Model-Answer Rubric

- are public and private boundaries explicit
- is admin access separated from customer traffic
- is data-plane versus admin-plane access treated differently
