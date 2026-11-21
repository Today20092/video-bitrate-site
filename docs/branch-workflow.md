# Git workflow

`main` is the only long-lived branch. Each task gets its own branch and pull request into `main`; there is no integration branch and no stacked PRs.

## Work on a task

1. Work in a worktree the host manages, based on current `origin/main`. A T3 Code thread on the main checkout moves itself with `t3_worktree_handoff` before editing; the project's worktree script runs `npm ci`. Without host worktree tools, use `git worktree add` and run `npm ci`.
2. Commit work in progress instead of using `git stash`: stashes are shared by every worktree.
3. Make the change and run `npm run build`. There is no CI on pull requests, so report the build result in the PR.
4. End every code task with a commit and a pull request to `main`, without being asked. Opening a PR is safe; only a merge deploys the public GitHub Pages site.
5. No checks run on the PR; run the build yourself before asking for a merge.
6. Merge only when the user asks, with a merge commit.

Fetch before choosing a base. Use `git pull --ff-only` to advance a local `main`; inspect divergent histories and merge deliberately. Never force-push `main`.

## What runs where

| Event | Effect |
| --- | --- |
| Pull request | Nothing runs |
| Push or merge to `main` | [Pages workflow](../.github/workflows/astro.yml) builds and deploys |
| Manual dispatch | Builds and deploys |

## Repository controls

`main` has no branch protection, because no check runs on pull requests. Merged branches are deleted automatically.

## Cleanup

GitHub deletes a merged PR's branch. Remove the task's worktree through the host (or `git worktree remove`) once it has no uncommitted or unmerged work.
