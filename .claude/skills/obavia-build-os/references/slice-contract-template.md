# SPEC — S### <outcome slug>
Version: 0.1 · Status: draft | approved | in-progress | ready-for-local-review | ready-for-pilot | released · Approved by: <founder, date> · Commit baseline: <sha>

## User outcome
Who can now do what that they could not do before?
## Why this slice now
Which future capabilities depend on it? Which costly uncertainty does it test?
## In scope
## Explicit non-goals (mandatory)
## User journey (happy path, numbered)
## UX states per screen
entry · loading · empty · validation · partial data · stale data · unauthorized · offline/retry · conflict · recovery
## Data created / touched (domain records)
## Permissions (who may read/transition what; server-enforced)
## Interfaces (API contracts frozen before parallel work)
## Dependencies & external access (each: validated? blocker?)
## Failure modes (and required behavior)
## Acceptance criteria (each observable, each mapped to a test)
## AI evals (if AI touches this slice: grounded-claim tests, refusal tests, disclosure)
## Security checks (authz DOA tests, tenant isolation, secrets, uploads)
## Guardrail check (never-list touched? → founder + counsel gate)
## Telemetry (what we measure to learn)
## Operational support (who handles failures during pilot)
## Rollback
## Cost / access limits (tokens, SMS, IDV, envelopes; budget cap)
## Validation commands
## Exit criteria
## What this unlocks next

---
# PLAN.md — task rule (from PAUL)
Every task in PLAN.md has exactly four fields. If you cannot fill all four, the task is too vague — split it or research it first.
```
T-## <name>
  files:  <exact paths this task may touch; nothing else>
  action: <what changes, in one or two sentences>
  verify: <the command or check that proves it, with expected output>
  done:   <the observable condition that closes the task>
```
Tasks are ordered by dependency. A task with no verify is not a task. A worker returns the verify output, not the word done.
