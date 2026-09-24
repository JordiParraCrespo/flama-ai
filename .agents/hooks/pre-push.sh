#!/usr/bin/env bash
# PreToolUse hook on Bash: refuse a `git push` whose HEAD tree has not passed
# `pnpm ci:local`. Pull request CI is a thin confirmation (see
# scripts/ci/affected.mjs); the suite is meant to run here first, so a push
# arrives green instead of turning CI into the place an agent iterates.
#
# `pnpm ci:local` records every tree it passes in .git/flama-ci-ok. A push is
# let through when HEAD's tree is in that record, so rebasing or amending
# without changing the content needs no second run. Deleting a remote branch
# pushes no code and is always allowed.
set -uo pipefail
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only a git push, wherever it sits in a compound command.
echo "$command" | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+push([[:space:]]|$)' || exit 0
echo "$command" | grep -Eq '[[:space:]](--delete|-d)([[:space:]]|$)' && exit 0

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$repo_root" || exit 0

tree=$(git rev-parse 'HEAD^{tree}' 2>/dev/null) || exit 0
record=$(git rev-parse --git-path flama-ci-ok)
if [[ -f "$record" ]] && grep -qx "$tree" "$record"; then
  exit 0
fi

reason="Push blocked: HEAD's tree (${tree:0:12}) has not passed the local CI suite. Run \`pnpm ci:local\`, fix what it reports, commit, then push again. It runs the checks pull request CI runs, over the packages this branch affects, and records the tree it passed."
jq -n --arg r "$reason" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
exit 0
