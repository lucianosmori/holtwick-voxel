#!/usr/bin/env bash
# Ralph-loop runner (bash / git-bash on Windows).
# Defaults: bounded iterations, timebox, Telegram pings on start/end/blocked.
#
# Usage:
#   ./loop.sh                        # 20 iterations, 60-min timebox
#   MAX_ITER=10 TIMEBOX_MIN=30 ./loop.sh
#
# Requires: claude CLI on PATH. Optional: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
# in env (or ~/.claude/channels/telegram/.env) for mobile pings.

set -euo pipefail

MAX_ITER="${MAX_ITER:-20}"
TIMEBOX_MIN="${TIMEBOX_MIN:-60}"
EXPERIMENT="$(basename "$PWD")"
START_TS="$(date -u +%s)"
DEADLINE=$((START_TS + TIMEBOX_MIN * 60))

# Load telegram creds if present (not committed — shared user config)
if [ -f "$HOME/.claude/channels/telegram/.env" ]; then
  # shellcheck disable=SC1090
  set -a; . "$HOME/.claude/channels/telegram/.env"; set +a
fi
TG_CHAT="${TELEGRAM_CHAT_ID:-}"

ping() {
  local msg="$1"
  [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && return 0
  [ -z "$TG_CHAT" ] && return 0
  curl -s -o /dev/null -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT}" --data-urlencode "text=[${EXPERIMENT}] ${msg}" || true
}

check_done() {
  # Graduation signal: status.json status == "graduated" or "abandoned"
  if [ -f status.json ] && grep -qE '"status"\s*:\s*"(graduated|abandoned)"' status.json; then
    return 0
  fi
  return 1
}

ping "loop start — max_iter=${MAX_ITER}, timebox=${TIMEBOX_MIN}m"

for i in $(seq 1 "$MAX_ITER"); do
  if [ "$(date -u +%s)" -ge "$DEADLINE" ]; then
    ping "loop stopped — timebox exhausted at iter ${i}"
    exit 0
  fi

  if check_done; then
    ping "loop stopped — status.json signals done at iter ${i}"
    exit 0
  fi

  echo "=== iter ${i}/${MAX_ITER} ==="
  # Single-prompt invocation. claude reads PROMPT.md + IMPLEMENTATION_PLAN.md.
  claude -p "Run one iteration per PROMPT.md. Pick exactly one task from IMPLEMENTATION_PLAN.md (highest priority unfinished), complete it, update files, commit on green. Green means: \`npm run build\` AND \`npm run validate:visual\` both pass — run them locally before committing and abort the iter if either fails." || {
    ping "iter ${i} FAILED — see terminal"
    exit 1
  }

  # Post-iter validation gate (P2.0). Belt-and-suspenders: the agent should
  # also run these before committing, but the loop re-runs them so an iter
  # that regressed visuals halts the burn instead of compounding breakage.
  echo "=== iter ${i} validation gate ==="
  export ITER="${i}"
  npm run build || { ping "iter ${i} build FAILED after commit — halting"; exit 1; }
  npm run validate:visual || { ping "iter ${i} validate:visual FAILED after commit — halting"; exit 1; }
done

ping "loop stopped — max_iter=${MAX_ITER} reached"
