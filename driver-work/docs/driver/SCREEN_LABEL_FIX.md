# Shadowveil — Screen-label correction 0.1.2

## Scope
A presentation-only correction to Foundation 0.1.1. The hidden 3D driver and illustrated 2D output are retained. This is not a new anatomy, artwork, weight-map, or direction-solver rebuild.

The previous UI put anatomical R/L markers on the front-view shoulders and labeled the screen-right wrist “Her left · Wrist.” This release defaults to screen-relative names, consistently across the canvas, shoulder markers, selected-joint menu, inspector, and diagnostic handle labels.

## Use
Open `Shadowveil_Driver_Screen_Labels.html` in an executing browser. The header reads **FOUNDATION 0.1.2 · SCREEN LABELS**. The source add-on retains `Shadowveil_Character_Driver_Foundation.html` and `public/driver-foundation/index.html` as the stable build paths.

In the viewport toolbar, **Labels → Screen left / right** is the default. The visible left wrist says **Screen left · Wrist** and the visible right wrist says **Screen right · Wrist**. The markers say **Screen L** and **Screen R**, not unexplained anatomical letters.

**Labels → Character anatomy** is an explicit optional convention. It says **Character left/right** and uses **Char L/Char R** markers. This mode does not change drag directions.

Screen left/right is measured relative to the projected pelvis, not the browser's midpoint. A hand crossing the character's centre changes its screen-location label; the bone's permanent identity does not change. Near the centre the label says **Screen centre**. Projected coincident left/right nodes, such as in the neutral profile view, say **Screen overlap** rather than inventing a left/right distinction. Midline controls retain their names (Head, Pelvis, etc.).

The inspector retains the explicit anatomical identity and technical bone ID. This is intentional: changing a UI convention must not swap skeleton links, weights, asymmetrical artwork, or saved poses. Label text is refreshed in place while option values and selection stay fixed.

## What stayed unchanged
- Skeleton calibration, hierarchy, bone IDs and math.
- Node-placement solver, rotation-ring mapping and pose limits.
- The 2D artwork, reference copies, atlas and numerical weights.
- Registered-view support and the pending definitive-guide workflow.
- No new artwork or substitute 3D character was generated.

`asset-and-code-integrity.json` records the unchanged source/asset hashes. An artwork-only browser comparison at an identical pose, camera and viewport produced identical canvas dimensions and pixel hashes between 0.1.1 and 0.1.2. Toggling the new convention with overlays hidden also left the pixels unchanged.

## Persistence and compatibility
An optional `workspace.labelBasis` field stores `screen` or `anatomical`. Old project files without this field import as `screen`; they are not mirrored or rebound. Explicitly saved anatomical preference is restored. Unsupported preference values are rejected. The project format and rig revision are unchanged.

Browser download and file-input reimport restored the preference, selection, pose and camera. IndexedDB-origin save/reload and physical Android behavior were not tested here. Keep an exported project backup.

## Actual checks in this revision
- Strict TypeScript build passed.
- **60 numerical/document tests passed:** 47 retained regressions and 13 new label/document tests.
- **24 new browser checks passed**, covering the reported screen-right/anatomical-left mismatch, actual canvas text, dropdown/inspector consistency, front/back/profile labels, explicit anatomical mode, mobile text bounds, old-project import, real file download/reimport, and two real Chromium emulated-touch gestures with touch-down and signed movement checks.
- **29 retained foundation browser checks and 49 direction browser checks passed** on this same final HTML. Only the revision/header assertion and the expected descriptive anatomical-label wording were updated in the retained direction browser test.
- Source tests for crossed-hand/centre labeling use synthetic world positions to test the label formatter; those are not claims of validated crossed-arm anatomy.

Browser screenshots are captures of the actual delivered HTML executing in Chromium. The harness loads the exact bytes with Playwright `set_content`; it does not draw a replacement interface, disable the document CSP, or use a different pose renderer. Canvas text instrumentation records real draw calls without altering their output. The HTML SHA-256 is recorded in each browser report.

This is label/migration/input-regression verification, not an artistic anatomy certification. Side/back views still show the hidden driver only outside the registered front-art range. A fresh full original Vite/TanStack build and physical Android performance remain unverified.

## Apply the source add-on
Back up the existing project, then extract `Shadowveil_Driver_Screen_Labels_Source.zip` into its root, preserving paths. It contains the full driver add-on and compiled runtime, not a replacement for the original project's package dependencies. The active route is not silently switched.

If the DriverFoundation route is already active, the replacement runtime supplies the change. To activate it explicitly or refresh the build/test hooks:

```sh
node scripts/activate-driver.mjs
npm run driver:build
npm run driver:test
```

The activation script backs up the route and package manifest before changing them. The source builds independently using the installed TypeScript compiler:

```sh
node scripts/build-driver.mjs
node --test tests/driver/core.test.mjs tests/driver/direction.test.mjs tests/driver/labels.test.mjs
python tests/driver/labels-browser.py
```

The new browser test accepts `PREVIOUS_DRIVER_HTML` pointing to the original 0.1.1 standalone for the before/after comparison. It also needs Python Playwright and Chromium; `CHROMIUM_EXECUTABLE` overrides the browser path. The original comparison HTML is not duplicated inside this update.

## Changed implementation
- `src/lib/puppet/driver/labels.ts`: shared, read-only presentation formatter.
- `src/lib/puppet/driver/app.ts`: convention selector, dynamic labels, canvas text bounds.
- `src/lib/puppet/driver/document.ts`: optional validated preference and legacy default.
- Build/activation scripts: revision and test hook.
- New label tests plus the two explicit display assertions in the retained direction browser test.
