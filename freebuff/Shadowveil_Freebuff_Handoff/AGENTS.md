# Shadowveil handoff workspace

Read `START_HERE_FREEBUFF.txt`, `FREEBUFF_HANDOFF.md`, and `ACCEPTANCE_TESTS.md` before editing.

## Non-negotiable project boundaries

- The user's development baseline is **Screen Labels 0.1.2**, not Workbench 0.2.0.
- Preserve the selected driver's interface and evolve it; do not substitute another application.
- Visible character = the supplied **2D illustrations**. The shared 3D skeleton/guides are hidden except explicit inspection overlays. No finished/rendered 3D character is requested.
- Preserve anatomical IDs, weights, asymmetric design, corrected drag directions and default screen-relative labels.
- `references/Shadowveil_Interactive_Master_Sheet.html` is the current art inventory. Read `references/catalog-index.json` for metadata before loading large base64 payloads.
- Original catalog approval labels, technical QC and runtime registration are independent statuses.
- `baseline/`, `references/`, `prior-reports/` and `evidence/handoff-input-audit.json` are reference inputs, not editing targets. Use a development copy or a backed-up project branch. Verify the handoff package before copying.
- Do not promote drawings to bound/approved merely because they exist. Never claim real pose support by swapping static full-body images under moving nodes.
- Flag clipping and contaminated crops. Preserve originals, author separate derivatives, and record provenance. No automatic regeneration or mirroring.
- Distinguish source facts from proposed architecture and measured test results. Old passing reports are historical.
- Real browser interaction and visual checks are required. No simulated screenshots presented as app captures.
- Respect explicit stop requests. Do not deploy, publish, send data to another service, spend money or modify unrelated projects.

## Workspace caveats

`driver-source/` is the supplied driver source add-on, not the original full Vite/TanStack application. It has an independent build script; full app integration requires the existing app's root files and dependencies. Do not invent a complete package manifest or overwrite one to hide missing dependencies.

The current task is to continue this driver's development using the supplied handoff. If the user only requests inspection, remain read-only. Do not copy this file over an unrelated existing project's AGENTS.md; merge relevant project notes deliberately.
