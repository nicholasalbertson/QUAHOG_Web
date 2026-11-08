#!/usr/bin/env bash
# §0.1 Pre-commit: typecheck + unit on staged TS (lightweight).
set -euo pipefail
cd "$(dirname "$0")/.."
echo "[pre-commit] tsc --noEmit"
npx tsc --noEmit
echo "[pre-commit] vitest sim"
npx vitest run src/__tests__/sim/checklistStability.test.ts --reporter=dot
echo "[pre-commit] ok"
