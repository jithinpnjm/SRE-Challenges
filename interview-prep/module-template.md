# Reusable SRE Study Module Template

Use this structure when improving or adding major study pages.

The goal is to make every page teach four things:

1. **Mental model**: how to think about the system.
2. **Memory palace**: how to remember it under pressure.
3. **Operational workflow**: what to check, in what order, and why.
4. **Interview answer shape**: how to explain it like a senior SRE.

---

## 1. What This Module Helps You Do

By the end of the page, the reader should be able to:

- explain the system in production terms
- identify common failure modes
- choose the right commands or tools for the symptom
- interpret outputs instead of memorizing command names
- connect the topic to Kubernetes, cloud, observability, and incident response

---

## 2. Memory Palace

Start with a relatable scene.

Examples:

- Linux host as a **hospital**
- Networking as a **hotel guest journey**
- Kubernetes as a **city operations center**
- Observability as an **emergency command room**
- Cloud architecture as an **airport/city grid**
- CI/CD as a **factory assembly line**

Include a mapping table:

| Technical concept | Memory hook | Production meaning |
|---|---|---|
| Example | Example | Example |

---

## 3. Senior Mental Model

Explain the topic as a system, not as a list of commands.

A strong section answers:

- What is the system responsible for?
- What can go wrong?
- What signals expose the failure?
- What should be checked before changing anything?
- What mistake does a junior engineer often make here?

---

## 4. Fast Triage Flow

Give a first-pass investigation sequence.

Format:

1. **Classify the symptom**
2. **Check current state**
3. **Inspect the dependency path**
4. **Look for recent errors or changes**
5. **Mitigate safely**
6. **Explain the root cause candidate**

For commands, always include interpretation:

```bash
example-command
```

What this tells you:

- expected signal
- suspicious signal
- next check

---

## 5. Command Or Tool Interpretation

Prefer interpretation tables over long command dumps.

| Command/tool | What it answers | Bad signs | Next step |
|---|---|---|---|
| `example` | What question it answers | What looks wrong | Where to go next |

---

## 6. Real Incident Stories

Add 2-4 short scenarios.

Each scenario should include:

- symptom
- wrong first assumption
- better investigation path
- likely cause
- safe mitigation
- interview-quality explanation

---

## 7. Kubernetes / Cloud / Platform Connection

Every foundation page should explain why the topic matters in modern platforms.

Examples:

- Linux pressure becomes Kubernetes node pressure.
- DNS issues become service discovery failures.
- Filesystem issues become pod mount or image-pull failures.
- CI/CD mistakes become unsafe rollout or rollback failures.

---

## 8. Hands-On Drill

Give one practical drill the learner can run locally or in a lab.

A useful drill includes:

- setup
- failure injection
- commands to inspect
- expected observations
- remediation
- what to say in an interview

---

## 9. Interview Answer Shape

Provide a spoken answer pattern.

Example format:

> “I would first classify whether the failure is local, dependency-related, or platform-wide. Then I would inspect the fastest signals that separate compute, storage, network, policy, and application failure. I would avoid changing the system until I had enough evidence to choose a safe mitigation.”

---

## 10. Recall Prompts

End with memory checks.

Examples:

- “In the hospital model, what does swap represent?”
- “In the hotel model, what does a closed port represent?”
- “What is the difference between DNS success, TCP success, and HTTP success?”
- “What command separates full disk from inode exhaustion?”

---

## 11. Companion Files

Link to related reading and labs.

- Foundation guides
- Hands-on labs
- Mock interviews
- Reference answers
