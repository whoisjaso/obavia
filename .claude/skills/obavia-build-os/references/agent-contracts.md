# Agent contracts
Main session = principal orchestrator. Owns north star, active slice, scope, dependencies, decisions, delegation, roadmap changes. Does not blindly accept specialist output. Stays out of low-level coding unless necessary.

| Agent | Receives | Returns | May not |
|---|---|---|---|
| product-ux-investigator | research, decisions, a journey question | user goal, journey with failure states, testable UX states | edit roadmap or code |
| architect | accepted requirement | boundaries, data ownership, authz model, interfaces, migration plan | decide business model |
| explorer | a specific question | facts with file paths / doc URLs / versions, marked verified vs inferred | write code |
| implementer | one bounded contract + frozen interfaces | code, tests, evidence (commands + output) | expand scope, touch other workers' files, say "done" without evidence |
| spec-reviewer | SPEC + diff + evidence | spec-compliance findings | judge code style |
| code-quality-reviewer | diff + tests | quality/regression findings | re-litigate scope |
| security-data-reviewer | diff touching identity/authz/docs/money/signatures/uploads/integrations/AI messaging | threat findings with DOA/tenant tests | run on CSS changes |

Parallel writers need frozen interfaces and isolated files/worktrees. Worktrees do not isolate a shared database or external accounts: use independent test data.
