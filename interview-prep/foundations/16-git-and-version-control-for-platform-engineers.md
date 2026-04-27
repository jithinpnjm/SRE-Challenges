# Foundations: Git Zero To Hero For SRE And Platform Engineers

Git is not just source control. For SRE and platform engineering, Git is the audit trail for infrastructure, the entry point for CI/CD, the source of truth for GitOps, and the safety net for recovering from bad changes.

This guide is designed as a complete path:

- Beginner: repositories, commits, branches, remotes
- Intermediate: merges, rebases, PR workflows, conflict resolution
- Advanced: object model, reflog, bisect, tags, recovery
- SRE Level: IaC review, rollback, GitOps, release safety
- Interview Level: explain tradeoffs and recover from mistakes calmly

---

# Part 1: What Git Actually Is

Git is a distributed version control system.

It stores project history as snapshots.

Core idea:

```text
working tree -> staging area -> commit history -> remote repository
```

| Area | Meaning |
|---|---|
| Working tree | Files currently on disk |
| Staging area / index | What will go into next commit |
| Commit | Snapshot plus metadata |
| Branch | Pointer to a commit |
| Remote | Shared copy, often GitHub/GitLab |

---

# Part 2: Beginner Daily Workflow

## Clone And Inspect

```bash
git clone https://github.com/org/repo.git
cd repo
git status
git log --oneline --graph --decorate
```

## Edit, Stage, Commit

```bash
git status
git diff
git add file.md
git diff --staged
git commit -m "Explain Linux memory pressure"
```

## Push And Pull

```bash
git push
git pull
```

Use `git status` constantly. It is your dashboard.

---

# Part 3: Mental Model Of Commits

A commit contains:

- pointer to a tree snapshot
- parent commit(s)
- author
- timestamp
- message

A commit is not only a patch. Git can compute patches by comparing snapshots.

A branch is just a movable pointer.

```text
main -> C -> B -> A
```

Creating a branch is cheap because Git only creates a pointer.

---

# Part 4: Branching

```bash
git switch -c feature/networking-zero-hero
git branch
git push -u origin feature/networking-zero-hero
```

Good branch names:

- `feature/add-linux-labs`
- `fix/broken-pages-build`
- `docs/networking-zero-hero`
- `hotfix/pages-deploy`

---

# Part 5: Pull Requests And Code Review

A good PR explains:

- what changed
- why it changed
- how it was tested
- rollback plan if relevant

For infrastructure changes, always include blast radius.

Example PR description:

```markdown
## What
Increase API timeout from 2s to 5s.

## Why
Users in EU saw timeout spikes during dependency latency.

## Testing
Validated in staging with synthetic checks.

## Rollback
Revert this PR.
```

---

# Part 6: Merge Vs Rebase

## Merge

Preserves branch history and creates a merge commit.

Best when:

- shared branch history must be preserved
- many people worked on the branch
- you want explicit integration history

## Rebase

Replays commits onto a new base and rewrites commit hashes.

Best when:

- cleaning local feature branch before PR
- keeping history linear

Rule:

> Do not rebase shared public history unless the team explicitly agrees.

---

# Part 7: Conflict Resolution

A conflict happens when Git cannot combine changes automatically.

Conflict markers:

```text
<<<<<<< HEAD
current branch version
=======
other branch version
>>>>>>> other-branch
```

Resolve by editing the file, then:

```bash
git add file
git rebase --continue
# or
git commit
```

Do not blindly accept one side. Understand both changes.

---

# Part 8: Undo And Recovery

## Undo Working Tree Changes

```bash
git restore file
```

## Unstage

```bash
git restore --staged file
```

## Revert A Commit Safely

```bash
git revert COMMIT_SHA
```

Use revert for shared branches because it preserves history.

## Reset Local History

```bash
git reset --soft HEAD~1
 git reset --mixed HEAD~1
 git reset --hard HEAD~1
```

- soft: keep changes staged
- mixed: keep changes unstaged
- hard: discard working tree changes

Be careful with hard reset.

---

# Part 9: Reflog — Your Safety Net

`git reflog` records HEAD movements.

```bash
git reflog
git checkout -b recovery HEAD@{3}
```

Use it after:

- accidental reset
- bad rebase
- lost commits
- detached HEAD mistakes

Many “lost” commits are recoverable until garbage collection.

---

# Part 10: Stash

```bash
git stash push -m "wip linux edits"
git stash list
git stash apply
git stash pop
```

Use stash when you need to switch context quickly.

Do not use stash as permanent storage.

---

# Part 11: Tags And Releases

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

Tags are useful for:

- releases
- deployment markers
- rollback references
- audit trails

Use annotated tags for important releases.

---

# Part 12: Git Bisect

Use bisect to find the commit that introduced a bug.

```bash
git bisect start
git bisect bad
git bisect good v1.0.0
git bisect run ./test.sh
git bisect reset
```

This is powerful for production regressions.

---

# Part 13: Git For SRE And Infrastructure

Git controls:

- Terraform changes
- Kubernetes manifests
- Helm charts
- CI/CD workflows
- runbooks
- alert rules
- dashboards as code

For infrastructure commits, write why, not only what.

Bad:

```text
Update values.yaml
```

Good:

```text
Increase checkout memory limit after OOM during peak traffic
```

---

# Part 14: GitOps Mental Model

GitOps means:

```text
Git desired state -> controller reconciles cluster -> drift corrected
```

Examples:

- ArgoCD
- Flux

Important GitOps idea:

> If it is not in Git, it should not be running in production.

---

# Part 15: Branching Strategies

## GitHub Flow

- branch from main
- PR
- CI
- merge
- deploy

Best for most modern web/platform teams.

## Git Flow

- main
- develop
- release branches
- hotfix branches

Useful for versioned products, but heavier.

## Trunk-Based Development

- short-lived branches
- frequent integration
- feature flags
- strong CI

Best for high-performing teams with mature tests.

---

# Part 16: Common Production Mistakes

## Accidentally Pushed To Main

Use:

```bash
git revert COMMIT_SHA
```

Do not force-push main unless explicitly coordinated.

## Secret Committed

Steps:

1. rotate secret immediately
2. revoke old secret
3. remove from history if needed
4. audit access

Cleaning history does not make leaked secrets safe.

## Large File Committed

Use Git LFS or remove from history with coordination.

## Bad Rebase

Use reflog.

---

# Part 17: Command Interpretation Table

| Command | What it answers | SRE use |
|---|---|---|
| `git status` | What changed locally? | daily safety check |
| `git diff` | What did I modify? | review before staging |
| `git diff --staged` | What will commit? | avoid accidental commits |
| `git log --oneline --graph` | What happened? | understand branch history |
| `git blame file` | Who changed this line? | incident investigation |
| `git show SHA` | What did one commit change? | audit/review |
| `git revert SHA` | Undo safely | rollback shared history |
| `git reflog` | Where did HEAD move? | recover mistakes |
| `git bisect` | Which commit broke it? | regression debugging |

---

# Part 18: Real Incident Stories

## Bad Config Merged

Symptom:

- production error rate spikes after config PR

Action:

- identify commit
- revert
- confirm recovery
- inspect test gap

## Terraform Destroy Appears In PR

Action:

- block merge
- review plan
- inspect lifecycle/protection
- split risky change

## GitOps Drift

Symptom:

- manual cluster change disappears

Explanation:

- controller reconciled back to Git desired state

---

# Part 19: Interview Questions

- What is a branch in Git?
- Merge vs rebase?
- How do you recover from reset hard?
- Why is force-pushing main dangerous?
- How would you find which commit introduced a production bug?
- What makes a good infrastructure commit?
- How does GitOps use Git differently from normal source control?

---

# Part 20: Labs

## Beginner

- create repo
- make commits
- create branch
- open PR

## Intermediate

- resolve merge conflict
- squash commits
- rebase feature branch
- tag a release

## Advanced

- recover lost commit with reflog
- find regression with bisect
- remove accidentally committed file
- simulate GitOps rollback

---

# Part 21: Senior Answer Shape

> I treat Git as the source of truth and audit trail for software and infrastructure. For shared branches I prefer safe history-preserving operations like revert. For local feature work I use rebase to keep reviewable history. I rely on protected branches, CI checks, meaningful commit messages, and PR review to control production change risk. If history is damaged, I use reflog and recovery branches before doing anything destructive.

---

# Recall Prompts

- Why is a branch cheap in Git?
- Why is revert safer than reset on main?
- What does reflog record?
- When is rebase appropriate?
- Why does GitOps require discipline around manual changes?
