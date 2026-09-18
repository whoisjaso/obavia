# Review packet — S### v<spec version> @ <commit sha>
Purpose: independent review by Claude.ai (no repo access assumed). Exclude credentials and real customer documents.
1. SPEC.md (verbatim)
2. Architecture + permissions excerpt relevant to this slice
3. Unresolved decisions
4. Diff (or diffstat + key files)
5. Test evidence: commands run, output, coverage of acceptance criteria (table)
6. Screenshots / recordings of the journey incl. failure states
7. Known gaps stated by the builder

Reviewer returns findings as: `F-## | severity (blocker/major/minor) | exact evidence | acceptance criterion affected | proposed correction | blocks release?`
No open-ended alternative architectures. One round; second round only for material remaining issues; empirical disagreements → narrow experiment.
