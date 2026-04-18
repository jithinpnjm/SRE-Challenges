# Git and Version Control for Platform Engineers

## What It Is and Why It Matters

Git is the version control system used for virtually all software and infrastructure code. For platform engineers, Git is not just source control — it is the audit trail for infrastructure changes, the mechanism for change review, the trigger for CI/CD pipelines, and the source of truth in GitOps deployments.

Understanding Git deeply — the object model, branching strategies, rebase vs merge, reflog and recovery, and how to structure clean commit histories for review — makes you effective at collaborative infrastructure work and enables you to recover from mistakes that would otherwise be catastrophic.

---

## Mental Model: Git's Object Model

Git stores everything as immutable content-addressed objects. There are four types:

```
Blob: file contents (identified by SHA-1 hash of contents)
Tree: directory (list of blob/tree pointers with names and permissions)
Commit: snapshot (tree pointer, parent commit, author, message)
Tag: named reference to a commit (signed or unsigned)
```

A commit is not a diff — it's a snapshot of the entire repository state at a point in time. Git computes diffs on the fly by comparing trees. This is why `git show` is fast and why operations like `git rebase` can be thought of as replaying commits.

```
HEAD → main → commit C → commit B → commit A
                          (tree)       (tree)
                          (author)     (author)
                          (message)    (message)
```

A branch is just a pointer (a 41-byte file) to a commit. Moving a branch is cheap — it's just updating a pointer.

---

## Core Operations

### Branching

```bash
# Create and switch to a new branch
git checkout -b feature/add-gpu-node-config
# or (newer syntax)
git switch -c feature/add-gpu-node-config

# List branches (local)
git branch

# List all branches including remote
git branch -a

# Push branch to remote and set upstream
git push -u origin feature/add-gpu-node-config

# Delete local branch (after it's merged)
git branch -d feature/add-gpu-node-config

# Delete remote branch
git push origin --delete feature/add-gpu-node-config
```

### Staging and Committing

```bash
# Stage specific files
git add src/config.py tests/test_config.py

# Stage part of a file (interactive hunk selection)
git add -p src/config.py

# Check what's staged
git diff --staged

# Commit
git commit -m "Add GPU node labeling configuration

- Add node feature labels for GPU type (A100 vs H100)
- Validate against available driver versions
- Add test coverage for edge cases"

# Amend the last commit (before pushing)
git commit --amend
# or to just change the message
git commit --amend -m "New message"
```

### Viewing History

```bash
# One-line log
git log --oneline --graph --decorate

# Detailed log for a file
git log --follow -p path/to/file.py

# Show a specific commit
git show abc123

# Who changed a line (blame)
git blame path/to/file.py

# Search commit messages
git log --grep="fix connection pool"

# Search for code addition/removal across history
git log -S "connection_pool_size"   # commits that added or removed this string
```

---

## Merge vs Rebase

### Merge

Merge creates a new "merge commit" that has two parents, preserving the full history of both branches:

```
Before:
    A - B - C  (main)
         \
          D - E  (feature)

After: git merge feature (from main)
    A - B - C - M  (main, M = merge commit)
         \     /
          D - E
```

Preserves exact history — you can see exactly when branches were merged and what was in each. Merge commits can make `git log --graph` look cluttered.

### Rebase

Rebase replays your commits on top of another branch, rewriting them to have new parent commits:

```
Before:
    A - B - C  (main)
         \
          D - E  (feature)

After: git rebase main (from feature branch)
    A - B - C - D' - E'  (feature, D' and E' are new commits with same changes)
```

Result is a linear history — looks like you wrote your feature after C, not branched from B. Cleaner log, easier to bisect.

**The rebase rule:** Never rebase commits that have been pushed to a shared branch. Rebase rewrites commit hashes — if others have pulled your commits, their history diverges. Rebase is safe on your local feature branch; unsafe on `main` or any shared branch.

### Interactive Rebase

Interactive rebase lets you clean up a branch's history before merging:

```bash
# Rebase last 4 commits interactively
git rebase -i HEAD~4

# Editor opens with:
# pick abc1234 Add GPU labeling
# pick def5678 Fix typo
# pick ghi9012 Add tests
# pick jkl3456 WIP cleanup

# Change to:
# pick abc1234 Add GPU labeling
# fixup def5678 Fix typo    ← squash into previous, discard message
# pick ghi9012 Add tests
# drop jkl3456 WIP cleanup  ← delete this commit entirely
```

Use interactive rebase to:
- Squash WIP commits before PR
- Reorder commits for logical grouping
- Edit commit messages
- Split one commit into multiple

---

## Branching Strategies

### GitHub Flow (Simple, CI/CD-friendly)

```
main (protected, auto-deployed to prod)
├── feature/add-monitoring
├── fix/connection-timeout
└── chore/update-dependencies
```

- Every change goes through a PR against `main`
- CI runs on every PR
- Merge triggers deploy to production
- Simple, works well for small teams with automated testing

### Git Flow (Release-oriented)

```
main (production releases)
develop (integration branch)
├── feature/new-feature
├── release/v2.3 (cut from develop, bug fixes only)
└── hotfix/critical-fix (branches from main, merges to both main and develop)
```

- More complex, appropriate for versioned products
- Release branches allow stabilization while development continues
- Hotfixes merge to both `main` and `develop`

### Trunk-Based Development

All developers commit to `main` directly (or via very short-lived branches). Feature flags hide incomplete features. Requires very strong CI and automated testing. Used at Google, Facebook, and other high-velocity organizations.

---

## Recovery Operations

### Undoing Changes

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged (but still present)
git reset --mixed HEAD~1   # (default for git reset HEAD~1)

# Undo last commit, DISCARD changes (destructive)
git reset --hard HEAD~1

# Undo a specific commit by creating a reverting commit (safe, preserves history)
git revert abc1234

# Unstage a file (don't remove changes from disk)
git restore --staged path/to/file.py

# Discard changes in working directory
git restore path/to/file.py   # WARNING: changes are lost
```

### Reflog — Your Safety Net

`git reflog` records every change to HEAD, including commits, resets, rebases, and branch switches. It keeps entries for 90 days by default.

```bash
# Show all recent HEAD movements
git reflog

# Output:
# abc1234 HEAD@{0}: commit: Add GPU labeling
# def5678 HEAD@{1}: reset: moving to HEAD~1    ← that accidental reset
# ghi9012 HEAD@{2}: commit: Add tests

# Recover from accidental reset --hard
git reset --hard def5678   # restore to the commit before the reset
# or
git checkout -b recovery-branch def5678
```

Reflog is why `git reset --hard` is recoverable (within 90 days) — the commits aren't deleted, just dereferenced. They become unreachable but still exist until garbage collected.

### Stash

```bash
# Save uncommitted changes temporarily
git stash

# Save with a description
git stash push -m "WIP: GPU node config"

# List stashes
git stash list

# Apply most recent stash (keep it in stash list)
git stash apply

# Apply and remove from stash list
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Drop a stash
git stash drop stash@{0}
```

---

## Git for Platform and Infrastructure Work

### Keeping Infrastructure as Code Clean

```bash
# Good commit message for infra changes
git commit -m "Increase connection pool size for checkout service

Previous: 20 connections max
New: 50 connections max

Reason: checkout service hitting connection exhaustion during peak traffic
(incident 2024-03-15). New value validated against DB max_connections=100
with 3 other services also running.

Fixes: https://internal.jira/PLAT-456"

# Link to incident or ticket in commit message
# Include "why" not just "what"
# Include the impact of not making this change
```

### Git Bisect

Binary search through commit history to find when a bug was introduced:

```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark a known good commit
git bisect good v1.2.0

# Git checks out a midpoint commit
# Test it: is it good or bad?
git bisect good   # or: git bisect bad

# Git keeps narrowing down
# Eventually:
# "abc1234 is the first bad commit"

# See what that commit changed
git show abc1234

# End bisect
git bisect reset
```

Bisect with automated test:
```bash
# Automate the process
git bisect run ./scripts/test-specific-behavior.sh
# Git will run the script, which exits 0 for good, non-zero for bad
```

### Tags

```bash
# Annotated tag (standard for releases, includes message, can be signed)
git tag -a v2.3.0 -m "Release 2.3.0: Add GPU scheduling support"

# Lightweight tag (just a pointer to a commit)
git tag v2.3.0-rc1

# Push tags to remote
git push origin v2.3.0
git push --tags   # push all tags

# List tags
git tag -l "v2.*"

# Show tag details
git show v2.3.0
```

---

## GitHub/GitLab Workflow

### Pull Request Best Practices

A good PR:
- Is focused: one logical change per PR
- Has a clear description: what changed, why, testing done
- References the issue or ticket
- Has test coverage for the change
- Passes all CI checks before requesting review
- Is small enough to review in 20 minutes (under 400 lines of change where possible)

```markdown
## What this PR does
Increases connection pool size for checkout service from 20 to 50.

## Why
Checkout service was hitting connection exhaustion during peak traffic.
See incident report: https://internal.wiki/incidents/2024-03-15

## Testing
- Validated against db-staging with load test (3x current peak traffic)
- Confirmed no other services affected (total connections 80 < max 100)
- Load test results: P99 latency improved from 4s to 800ms

## Rollback
Revert this commit. Pool size change takes effect on next pod restart.
```

### Protected Branches

For production-critical branches (`main`, release branches):
- Require PR (no direct push)
- Require CI to pass (all status checks green)
- Require at least 1 reviewer approval
- Require linear history (rebase before merge)
- Restrict who can push (only CI service accounts for auto-merges)

---

## Common Failure Modes

**Merge conflict on shared branch:** Two people edited the same file. Resolution: understand both sets of changes, reconcile them. Use `git mergetool` for complex conflicts. Don't blindly accept one side. After resolution: `git add <resolved-file>`, `git commit`.

**Accidentally pushed to main:** Immediately stop further work. If the commit introduced a bug, revert it (`git revert` — creates a new commit, preserves history). Don't force-push to main — others may have already pulled. Coordinate with the team.

**Lost commits after reset --hard:** Check `git reflog` immediately. The commits still exist until garbage collected. Create a new branch pointing to the reflog entry: `git checkout -b recovery HEAD@{3}`.

**Large files committed to git:** Git is not designed for large binaries. Committing a 500MB model file makes every clone slow. Fix: `git rm --cached large-file.bin`, add to `.gitignore`, use Git LFS for large files. If it's in history: `git filter-repo --path large-file.bin --invert-paths` to remove from entire history (then force push — coordinate with team).

**Diverged branches (non-fast-forward):** Remote has commits your branch doesn't, and vice versa. `git pull` with default merge creates a merge commit. To keep linear history: `git pull --rebase` replays your commits on top of the remote state.

---

## Key Questions and Answers

**Q: What is the difference between git merge and git rebase?**

Merge creates a merge commit joining two branch tips, preserving full history of both. Rebase replays commits from one branch onto another, rewriting commit hashes to create a linear history. Merge is safer for shared branches (history is preserved and never rewritten). Rebase creates cleaner history for feature branches before merging. The key rule: never rebase commits already pushed to a shared branch — it rewrites history and causes conflicts for anyone who has pulled those commits.

**Q: How do you recover from an accidental `git reset --hard`?**

Git doesn't immediately delete commits — it just moves the branch pointer. The commits become "unreachable" but still exist. Use `git reflog` to find the commit you want to recover: it shows every HEAD movement. Then `git reset --hard HEAD@{N}` to restore to that point. This works because reflog keeps entries for 90 days. After that, unreachable commits are garbage collected.

**Q: What is a detached HEAD state and how do you get out of it?**

Detached HEAD means HEAD points directly to a commit, not to a branch. Any commits you make in this state aren't tracked by any branch — they'll be garbage collected eventually. How you get there: `git checkout abc1234` (checking out a specific commit), `git checkout v2.0.0` (checking out a tag). To get out: if you made commits you want to keep, `git checkout -b new-branch` to create a branch at current position. If you just want to go back: `git checkout main`.

**Q: How does git handle conflicts during rebase?**

During rebase, Git replays commits one by one. When it encounters a conflict on a specific commit, it stops and lets you resolve it. Files with conflicts are marked with `<<<<<<<`, `=======`, `>>>>>>>` markers. Resolve the conflict, `git add` the resolved file, then `git rebase --continue`. If you want to abort and return to the state before rebase: `git rebase --abort`. Unlike merge where you resolve everything at once, rebase may require resolving conflicts for each commit in sequence.

---

## Points to Remember

- Git objects: blob (file), tree (directory), commit (snapshot with parent pointer), tag
- A branch is a pointer to a commit — cheap to create, no copying
- Merge preserves history; rebase rewrites history for linear log
- Never rebase commits that have been pushed to a shared branch
- Interactive rebase (`-i`) for cleaning up commit history before PR
- `git reflog` records all HEAD movements — your safety net for recovery
- `git reset --hard` is recoverable within 90 days via reflog
- `git stash` for temporary work-in-progress storage
- `git bisect` for binary-search debugging of when a bug was introduced
- Commit messages: what + why, not just what; reference tickets/incidents
- Protected branches: require PR, status checks, approval before merge
- Force-push to `main` is almost always wrong — use `git revert` instead

## What to Study Next

- [CI/CD and Trusted Delivery](./cicd-trusted-delivery-and-platform-security) — how Git drives CI/CD pipelines
- [Delivery Systems: Jenkins, GitHub Actions, ArgoCD](./delivery-systems-jenkins-github-actions-and-argocd) — GitOps with ArgoCD
- [Terraform and Infrastructure as Code](./terraform-infrastructure-as-code) — IaC in version-controlled repos
