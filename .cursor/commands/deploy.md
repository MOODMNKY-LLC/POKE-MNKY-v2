---
description: Deploy to Vercel — run pnpm build, commit changes, and push to GitHub (Vercel deploys on push).
---

# Deploy to Vercel (build → commit → push)

You are operating inside this repo in Cursor.

## Guardrails (do these first)
1) Confirm we’re in the project root (where `package.json` lives).
2) Confirm current branch and remote are correct.
3) Confirm there are either:
   - already-staged changes we intend to ship, **or**
   - unstaged changes that should be staged as part of this deploy.
4) Pull latest changes before building.

## Step 1 — Sync branch (safe default)
Run:

```bash
git status
git branch --show-current
git remote -v
git fetch --all --prune
git pull --rebase
