# AGENTS.md — fiesta-poc-<topic>

## Build / test / lint

<!-- Keep this file ~60 lines max. Commands only, no prose changelog. -->

```bash
# install
# <fill in>

# test
# <fill in>

# lint / typecheck
# <fill in>
```

## Ralph-loop conduct (experiment-local)

- **Stable spec**: `PROMPT.md`. Do not edit it mid-loop.
- **Disposable plan**: `IMPLEMENTATION_PLAN.md`. Priority-sorted, one task per iteration, drain top-down.
- **Before implementing**: search the codebase first. Don't assume something isn't implemented — duplicates from failed searches are a top failure mode.
- **Never leave placeholder implementations.** If you can't finish a task in one iteration, split it in the plan and pick a smaller first slice.
- **Commit only on green.** Tests/lint/typecheck must pass.
- **Commit message convention**: `ralph(iter N): <what changed>` so iterations are auditable.
- **If stuck two iterations on the same error**: stop the loop, read `NOTES.md`, rewrite `PROMPT.md` or split the plan item. Don't grind.
