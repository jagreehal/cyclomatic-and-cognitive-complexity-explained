#!/usr/bin/env bash
# Claude Code hook: run the complexity ratchet on what Claude changed, against the last commit.
#   complexity-check.sh edited   PostToolUse (Edit|Write|MultiEdit): the one file just changed, in about a second.
#   complexity-check.sh stop     Stop: every changed source file, once per turn, before Claude hands back.
# Silent when clean. On problems: exit 2 with the report on stderr, which Claude reads and acts on.
# Blocks on: a function that got worse on cyclomatic or cognitive complexity, a new function over a limit,
# and any new complexity override comment (agents may not add those; a person commits them).
# Needs: jq, git, and the ratchet installed (node_modules/.bin/complexity-ratchet).
set -uo pipefail

mode=${1:-edited}
input=$(cat)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
ratchet=${COMPLEXITY_RATCHET:-node_modules/.bin/complexity-ratchet}
[ -x "$ratchet" ] || exit 0

is_source() {
  case "$1" in
    node_modules/* | dist/* | build/* | coverage/* | */generated/* | *.d.ts) return 1 ;;
    *.ts | *.tsx | *.js | *.jsx | *.mts | *.cts | *.mjs | *.cjs) return 0 ;;
    *) return 1 ;;
  esac
}

files=()
if [ "$mode" = "stop" ]; then
  # A problem Claude could not fix must not trap it in a loop: report, don't block twice.
  active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false')
  while IFS= read -r f; do
    [ -f "$f" ] && is_source "$f" && files+=("$f")
  done < <(git status --porcelain --untracked-files=all | sed -E 's/^.{3}//; s/.* -> //')
else
  active=false
  f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')
  f=${f#"$PWD"/}
  [ -n "$f" ] && [ -f "$f" ] && is_source "$f" && files+=("$f")
fi
[ ${#files[@]} -gt 0 ] || exit 0

# Base = each file as of HEAD (missing for new files), head = the working copy.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/base" "$tmp/head"
for f in "${files[@]}"; do
  mkdir -p "$tmp/base/$(dirname "$f")" "$tmp/head/$(dirname "$f")"
  git show "HEAD:$f" >"$tmp/base/$f" 2>/dev/null || rm -f "$tmp/base/$f"
  cp "$f" "$tmp/head/$f"
done

# shellcheck disable=SC2086 # split on purpose, e.g. "--threshold 12 --cognitive-threshold 18"
report=$("$ratchet" compare --base "$tmp/base" --head "$tmp/head" ${COMPLEXITY_RATCHET_ARGS:-} 2>&1)
status=$?

problems=""
[ "$status" -ne 0 ] && problems+="$report\n\nRefactor so no function gets worse: guard clauses, a lookup table, a switch over a union, named predicates, or a decision table. Do not split a function at an arbitrary point.\n"
if printf '%s' "$report" | grep -q 'new complexity overrides'; then
  overrides=$(printf '%s' "$report" | sed -n '/new complexity overrides/,/Check each reason/p' | sed '1d;$d')
  problems+="New complexity override comments:\n$overrides\nRemove them. If you believe a score is a false positive, stop and ask the user; a person commits overrides.\n"
fi

[ -z "$problems" ] && exit 0
if [ "$active" = "true" ]; then
  printf "Complexity check still failing after a fix attempt (not blocking again):\n%b" "$problems" >&2
  exit 0
fi
printf "Complexity check failed:\n%b" "$problems" >&2
exit 2
