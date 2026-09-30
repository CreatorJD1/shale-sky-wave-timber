# Shadowveil — Freebuff development handoff

**Prepared:** 26 September 2026  
**Starting point:** FOUNDATION 0.1.2 · SCREEN LABELS  
**Requested outcome:** improve the selected character driver using the corrected artwork catalog, without replacing the application or changing the 2D-output architecture.

## 1. The decision that must not be lost

The user explicitly reuploaded `Shadowveil_Driver_Screen_Labels.html` and said **“This was the one I wanted you to work on.”** A different Workbench was previously developed and is not the selected base. A Workbench preview remaining open does not change that decision.

Use `baseline/Shadowveil_Driver_Screen_Labels.html` as the reference executable and `driver-source/` as its editable source. Do not substitute the Workbench, the older standalone 2D Pose Studio, a newly designed interface, or a finished 3D model. Source files are already unpacked; there is no need to recover TypeScript by reverse-engineering embedded JavaScript.

The request now is a handoff for **Freebuff**. This package has not changed the running driver. A previous Stop remains relevant to this handoff preparation: no implementation, deployment or external agent session was started here. The recipient can begin the scoped implementation when the user hands over the start prompt.

### Exact input identities

| Role | Package path | SHA-256 |
|---|---|---|
| User-selected executable | `baseline/Shadowveil_Driver_Screen_Labels.html` | `76b07f24a87b51a95bf9f8016102a4df7182be8be3a2757c1d3cc9632476d863` |
| Correct artwork catalog | `references/Shadowveil_Interactive_Master_Sheet.html` | `2820a063a7a58a9b945063bdd664d2854e7581057b389c7410e7645ee45e2d2e` |
| Source archive used to prepare `driver-source/` | Original name: `Shadowveil_Driver_Screen_Labels_Source.zip` | `ca3693c9f3a640b15f2c303844618c459971c711d405a25f35d9abcb3fe5d01b` |

Both `driver-source/Shadowveil_Character_Driver_Foundation.html` and `driver-source/public/driver-foundation/index.html` match the selected executable hash above. Their older-looking filenames are stable build paths, not different revisions. The original source archive was expanded unchanged; the archive itself is not duplicated in this package.

## 2. What the user wants

The final image must remain **the approved 2D illustration**. A hidden 3D driver contributes pose, joint relationships, camera/depth guidance and movement constraints. Lightweight guides are acceptable; a finished textured/sculpted 3D character is not the objective.

One persistent character document should hold the driver, pose, camera, selected joint, artwork references, view registrations, weights, correctives and saved poses. Front/three-quarter/profile/back are views of the same pose, not independent puppets. Weights, seams, driver and strain should be inspection overlays in one viewport, not a proliferation of tabs or separate editors.

Repeated reported failures include inverted input/labels, stiffness, missing articulation, unnatural joint combinations, disconnected shoulders/waist/limbs, transparent holes, wrong ownership of neighbouring pixels, and camera positions without registered art. Passing numerical checks alone did not satisfy the user. Preserve the latest direction and label fixes while addressing the underlying mapping and artwork limitations.

The corrected source sheet describes an adult woman with warm brown skin, a black high bun and loose strands, graphite cold-shoulder suit, gold linework, long brown mesh torso panel, and dedicated open-toe sandal references. It specifies character-right amber/gold and character-left green: front-view viewer-left amber, viewer-right green. This is a reference rule; do not silently repaint existing variant artwork or reverse the rig. Preserve distinct outfit variants and flag conflicts for a design choice. [S2]

## 3. What exists in the selected source — not a proposed feature list

| Area | Verified by source inspection in this handoff |
|---|---|
| Driver | 21 hierarchical bones; normalized quaternion pose rotations; fixed bind positions and lengths. Rest positions are planar, in inherited bind-pixel units. Actual rotations can produce depth. |
| Renderer | Existing 2D textured triangle surfaces, fed externally projected positions. A legacy neutral pose is passed to avoid applying an independent second deformation. |
| Controls | Screen-plane node placement changes appropriate ancestors; a separate ring rotates the selected bone. Mouse/touch capture, grab offset, cancellation, nudges and screen-direction rejection are implemented. This is not a complete contact-aware 3D IK rig. |
| Labels | Default screen-relative names measured around the projected pelvis. Anatomical IDs stay fixed; centre/overlap cases are explicit. |
| Weights | Seed v5 numeric bindings and shared attachments are loaded into the driver. The heatmap uses those data, not a generated picture. |
| Safeguards | Individual provisional local-axis bounds, combined spine effort, and 3D bound-surface scale/seam checks. The final constrained node move is checked against the requested screen direction. |
| Persistence | Checksummed export/import embeds seed resources. IndexedDB autosave is implemented with explicit failure status. Historical notes do not verify real-origin reopen or physical Android performance. |
| Guide workflow | Inert HTML reference staging plus optional strictly validated JSON metadata. Approval marks registration `needs-review`; it does not fit a rig or bind a new drawing. |
| Art coverage | Front pilot only. Side/back buttons inspect the retained driver; they do not prove alternate drawings are registered. |

**The active foundation gate is not the whole legacy `pose-v5/PoseGuard`.** Legacy modules remain in the source, but the active route uses `driver.constrainPose()` and `driver.bindSurfaces()`. Do not advertise old planar collision/contact/corrective features as active simply because their source files are bundled. [S1]

### Why alternate views currently lose the artwork

`driver.ts::artCoverage()` explicitly rejects non-provisional registration, camera yaw outside ±12°, pitch outside ±8°, or a bone's local X/Y rotation above approximately 10°. `app.ts::draw()` renders the illustration only when that gate reports support. Guide approval also invalidates that provisional registration.

These are deliberate coverage stops, not a CSS loading problem. Do not remove them or widen thresholds to make the front texture pretend to be a profile/back drawing. The missing work is real per-view registration and a tested art envelope. [S1]

## 4. Corrected catalog and QC ownership

The current catalog contains **230 entries, 190 distinct original images, and 20 groups**. There are 50 `Source-approved` and 180 `Reference` entries; aliases are intentional. `references/catalog-index.json` preserves metadata without embedded image/preview strings so the recipient does not fill its context with base64. Original bytes remain embedded in the source HTML. [S2, handoff input audit]

All 190 originals were decoded and hash/size/dimension-checked during handoff packaging. They are RGB source images, not finished transparent rig layers. The historical QC registry hashes were also matched to these exact assets. This verifies identity, not that every source is artistically consistent or defect-free.

Use three separate fields in future authoring: **source approval label**, **technical QC**, and **runtime binding status**. Do not rewrite one from another. Retain IDs, aliases, source links, names and category membership.

Historical corrected-catalog findings are: 12 files with observed subject clipping, one missing crop target, ten with neighbouring fragments, and 57 with any annotation. These counts overlap and are historical visual findings, not a new exhaustive visual audit. The registry contains exact IDs, explanations and evidence limits. [S3]

- Exclude `EDGE_CLIPPED`, `INTERNAL_CLIPPED` and `CROP_TARGET_MISSING` assets from automatic complete-body binding. `EXTRA_FRAGMENT` requires corrected region ownership first.
- `DETAIL_CROP` is not automatically defective; use it only for the depicted region. `EDGE_TIGHT` means margin review, not established missing anatomy.
- Both T-pose source plates lose outer arm/hand content. Do not declare them complete bind masters.
- Jump has confirmed **screen-left fist** clipping; the other fist is a tight-margin note, not a second confirmed cut.
- G-11's heel-detail crop is largely blank/caption; padding it cannot restore a heel.
- Internal flat cuts in padded facial panels still count as clipping.
- Ten damaged keyed derivatives from the earlier MHT are absent from this corrected catalog. Do not propagate those old defects by similar name to different bytes.

Use `recovery_candidates` in the shortlist to inspect larger source sheets before regenerating a clipped crop. These links are visual correspondences, not proven crop transforms. Preserve the original and make a new derivative with parent hash, crop/mask operation and revision. [S3, S4]

## 5. Integration map

All paths below are under `driver-source/` in this package and become project-relative when merged deliberately.

| File | Role / intended extension |
|---|---|
| `src/lib/puppet/driver/app.ts` | Existing UI, drawing, input, status, guide and project import. Extend it; retain one viewport and current controls. |
| `driver/document.ts` | Project schema, guide review, compatibility checks and production queue. Add explicit versioned catalog/registration migration here or in dedicated modules. |
| `driver/driver.ts` | Persistent FK skeleton, bounds, weighted surfaces, projection and `artCoverage`. Keep anatomical identity authoritative. |
| `driver/controls.ts` | Screen/world transforms, node target solve, ring rotation and picking. Preserve direction/cancellation behavior. |
| `driver/labels.ts` | Presentation only. Must not become an ID-remapping layer. |
| `driver/math3.ts` | Dependency-free quaternion, dual-quaternion and camera math. No external 3D engine is required merely to keep using this driver. |
| `driver/storage.ts` | IndexedDB store and transaction acknowledgements; handle schema changes safely. |
| `pose-v5/surface.ts` | Weighted art surfaces and projected vertex rendering. Refactor regional bindings as needed without a hidden static sprite underneath. |
| `pose-v5/calibration.ts`, `skinning.ts` | Seed front calibration and local numeric weighting; do not copy image-space coordinates blindly to another drawing. |
| `src/components/puppet/DriverFoundation.tsx` | Existing React adapter loads compiled modules and assets. The user's full app is not included here. |
| `scripts/build-driver.mjs` | Independent subsystem compile and offline HTML bundler. Regenerate runtime files from source edits. |

### Migration hazards that need explicit handling

The guide importer allows **12 MiB**, while the corrected catalog is **61,096,318 bytes**. Add a separate inert catalog importer; do not funnel the catalog into guide approval, execute its scripts, or globally invalidate current art just to browse it.

Project import currently requires an identical resource object, exact provisional rig calibration, one `legacy-front-pilot` registration, a fixed 12-task queue, and a 64 MiB package ceiling. Multi-view authoring requires a versioned schema/resource migration—not deleting those checks. Preserve valid old saves and reject unknown/corrupt bindings with a useful explanation. [S1]

The current offline document blocks network connections via CSP. Preserve offline operation and safe parsing. A future same-origin app may load local resources differently, but do not disable security wholesale to make an arbitrary HTML import work.

The existing IndexedDB database is `shadowveil-character-driver`, with `projects/active`. Back up exports before testing competing versions at the same origin. An HTML file does not contain the user's live local-storage state; no current user pose/project export was supplied with this handoff.

## 6. Proposed next implementation — not already delivered

### Milestone A: establish the exact baseline

Run the package verifier, copy the source to a working folder or backed-up branch, inspect the actual files and reproduce the baseline in a real browser. Save an overlay-off reference capture at a fixed pose/camera and an exported project. Record environment and SHA-256.

Do not replace project dependencies or the active route just to make an incomplete build look successful. The driver add-on builds independently; full React/Vite integration must be tested separately in the original app.

### Milestone B: integrate the current art registry in the existing inspector

Add a source selector/search plus QC status without replacing the entire interface. Parse `catalog-data` as data, never as executable page content. Preserve its 230 entries/190 assets. Keep source originals immutable and avoid loading all decoded full-resolution images into memory simultaneously.

Browsing/importing sources must not change the current pose, selected bone, registration, or design approval. Start with `reference_available / needs_review`. Use hashes, not titles, for binding identity.

### Milestone C: persist one real front → three-quarter → profile registration proof

Use a consistent candidate family after inspecting the actual drawings. Candidate IDs are indexed below. Labels such as F-02 or Profile are not numerical camera calibration; source stances differ.

Each view packet needs an authored source pose and camera, its own 2D landmarks/mesh/UVs, permitted regional influences, seam attachments, support envelope and corrective/occlusion metadata. All refer to the same permanent skeleton. Moving an anchor must not silently recalibrate the skeleton or overwrite another view's weights.

Bind points to lightweight driver regions or named landmark frames. Choose one deformation owner: the guide drives the art, or the art evaluates its bone binding; never both. Keep local ownership so an arm cannot drag trouser, torso or neighbouring-limb pixels. Complete concealed attachment areas only from a suitable existing source or an explicitly approved new drawing.

Prove one arm first. Change pose, switch drawings, retain the driver pose and selected anatomical joint, and demonstrate actual illustrated deformation in each supported view. A static full-body sprite selector is not that proof. Do not increase the art count until this works visually.

### Milestone D: validate shape and persistence together

Separate camera-independent driver constraints from view-dependent artwork validity. Expected foreshortening must not be mistaken for physical shortening. The art check should evaluate residual distortion, visibility and attachment gaps for the registered reference, while driver limits continue to apply.

Store source/driver/topology revisions, authoring transforms, weights, seams, constraints and view coverage in one document. Version the schema, migrate old saves explicitly, and export sufficient resources or verified resolvable references. Save, close/reopen, and reimport must retain the same state.

### Milestone E: expand only demonstrated coverage

After the vertical slice, add back/opposite-side drawings, per-part selection and view-aware corrections. Do not mirror asymmetric artwork or use unregistered nearby views outside their declared ranges. A fallback must report requested versus rendered angle and must not pretend to preserve an unsupported view.

The earlier 12-image batch and approximately 180-drawing plan were planning estimates. The corrected catalog contains substantial reusable art. Reconcile actual missing concealed surfaces, hand orientations and corrections before requesting generations. Weight maps are derived numerical diagnostics, not image-generation tasks.

## 7. Candidate source identities

These are **unbound review candidates**, not a prescribed interchangeable outfit or approved camera sequence. The supplied shortlist has `planning_only_no_bindings` and null registration fields. [S4]

| Source label | Asset ID |
|---|---|
| A-pose front | `609b4cd3490ed307cd7a` |
| Relaxed neutral / Front | `64167ffae03790144f46` |
| Three-quarter front | `d36189adcd77932279b1` |
| Profile | `a89eff7897a08c55a952` |
| F-01 · Front | `e0628ddf8c351b3b9425` |
| F-02 · 3/4 Front | `48ba4faf9045baac59c6` |
| F-03 · Side | `cff7d8f7da882463c78b` |
| F-04 · Back | `2295966a7b88e03ed679` |
| F-05 · Side Profile | `ae0b6188f54eabd9a299` |
| F-06 · Back View | `f0334278aece8e133db1` |
| Original anatomy turnaround | `c785b213cc7bbdb864eb` |

## 8. Starting and testing locally

Read `START_HERE_FREEBUFF.txt` into the chosen Freebuff session. Its official repository documents running `freebuff` in a project directory; no custom Freebuff SDK, cloud deployment or account automation is needed for this handoff. Installation, when required, is `npm install -g freebuff`. No installation was performed here. [S6]

Before edits, at the handoff root:

```sh
python tools/verify_bundle.py
```

Copy `driver-source/` to a development workspace. The provided add-on is not a complete Vite app and has no replacement root package manifest. In the working copy, with Node and TypeScript available:

```sh
node scripts/build-driver.mjs
node --test tests/driver/core.test.mjs tests/driver/direction.test.mjs tests/driver/labels.test.mjs
```

The build script resolves local TypeScript or falls back to globally installed TypeScript. Inspect missing prerequisites and adapt paths for the actual machine; do not install the original app's unrelated dependency graph merely to run this subsystem.

Browser scripts use Python Playwright and Chromium. They default to `/usr/bin/chromium`; set `CHROMIUM_EXECUTABLE` to an actual local browser executable, or adapt the harness to its installed Playwright browser. The label comparison also needs `PREVIOUS_DRIVER_HTML` pointing to the absolute path of `prior-reports/Shadowveil_Character_Driver_Direction_Fix.html`.

```sh
python tests/driver/browser-check.py
python tests/driver/direction-browser.py
python tests/driver/labels-browser.py
```

These scripts read the generated `Shadowveil_Character_Driver_Foundation.html`. They use the actual HTML with Playwright `set_content`, not a substitute renderer. Add a stable-origin reload test separately; `set_content` alone is not an IndexedDB persistence test.

For intentional integration into the existing original application, merge into a backed-up branch first. The supplied `scripts/activate-driver.mjs` backs up `Studio.tsx` and `package.json`, adds build/test scripts, and mounts `DriverFoundation`. Run it only in the actual existing project after checking its state. Do not activate a different route silently. [S1, S5]

## 9. Required deliverables

Return a patch against the selected source, rebuilt runnable HTML, an exact changed-file list, fresh browser/numerical reports and actual screenshots of the same output with handles off and on. Show the user what changed in their existing driver, not another review-only catalog.

Use `ACCEPTANCE_TESTS.md` as release gates. Record requests versus constrained results, unresolved art coverage, native-device/browser limitations, baseline/output hashes, and whether the full original app or only the subsystem was tested. Do not call a release all-angle, anatomically approved or production-ready from numerical checks alone. No app publication or new artwork generation is included in this task.

## 10. Evidence and confidence

**Fresh in this handoff:** file/package hashes; source-archive HTML parity; 190 original image decodes and metadata checks; catalog/QC asset identity and entry alignment. `evidence/handoff-input-audit.json` records these operations.

**Historical:** reports and browser screenshots in `prior-reports/` and source documentation. They describe previous checks, not a newly reproduced result. No fresh driver compile, browser pose session, physical Android check, real-origin persistence test or Vite production build was performed to create this handoff.

**Proposed:** Milestones B–E, new registration/schema/coverage behavior, and acceptance gates. Their presence in this document is not implementation evidence.

### Source key

- **S1:** exact baseline HTML and matching `driver-source/src/lib/puppet/driver/` plus imported `pose-v5` modules. Refer to named functions in Sections 3–5.
- **S2:** user-supplied `references/Shadowveil_Interactive_Master_Sheet.html`, Design reference, Collection notes, and `catalog-data`. `catalog-index.json` is a derived metadata-only convenience file.
- **S3:** `references/Shadowveil_Corrected_Catalog_QC_Manifest.json` and `prior-reports/Shadowveil_Corrected_Catalog_Review.md`; historical QC, preserved without automatic canon changes.
- **S4:** `references/Shadowveil_Corrected_Registration_Shortlist.json`; planning-only candidates and potential larger-sheet recovery sources.
- **S5:** `prior-reports/Shadowveil_Screen_Labels_Notes.md`, source build/activation scripts and historical verification archive.
- **S6:** Freebuff's official repository README, Quick start, checked 26 September 2026: https://github.com/CodebuffAI/freebuff . This source is used only for the product name and basic launcher, not as evidence for Shadowveil features.

No Freebuff session has been launched or sent these files by this handoff operation. The user chooses where to open or share the package.
