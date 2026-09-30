# Shadowveil — release gates for the next development slice

**Status: requirements, not test results.** Execute on the rebuilt Screen Labels-based application. Record each result as passed, failed, blocked, or not tested. Explain the last two; do not count them as passes.

## Evidence contract

Record the baseline hash, output hash, source revision, environment, viewport, pointer type, actual requested and accepted poses, selected anatomical IDs, asset hashes, and console errors. Save screenshots from the running application—not a reconstructed UI or an independently generated picture. Include an overlay-off capture to reveal artwork defects.

Synthetic mathematical tests are useful for exact transforms and labels, but they do not prove visually acceptable posing. Source-byte identity and a well-populated catalog do not prove runtime registration.

## A. Baseline, inventory and identity

| ID | Required check | Pass condition |
|---|---|---|
| A01 | Chosen executable and source | Reproduce Screen Labels 0.1.2; source archive's two standalone HTML files initially match the baseline hash. Workbench is not the base. |
| A02 | Existing control UI | Screen labels, node placement, ring rotation, nudges, camera controls, undo, export and failure notices remain available. |
| A03 | Catalog reconciliation | Exactly 230 entries, 190 distinct originals and 20 groups; IDs, aliases, collection membership and source statuses preserved. |
| A04 | Import separation | Catalog browsing/import does not approve a guide, invalidate active art, change pose or select a different outfit. |
| A05 | Resource integrity | Verify SHA-256, dimensions and byte count when extracting/importing originals. Modified derivatives receive their own IDs/hashes and provenance. |

## B. Input directions and joint identity

| ID | Required check | Pass condition |
|---|---|---|
| B01 | Horizontal and vertical movement | Test both wrist nodes, both ankle nodes and pelvis in front, three-quarter, profile and back driver views. A reachable requested component moves in that screen direction. Unreachable requests stop with an explanation, not reverse. |
| B02 | Camera/parent combinations | Repeat with combined yaw and pitch and pre-rotated parents. Positive screen X remains right; positive screen Y remains down. |
| B03 | Rotation ring | Clockwise pointer motion requests clockwise projected rotation for the appropriate nondegenerate view. Limits are reported. |
| B04 | Grab lifecycle | Touch/mouse down causes no snap. Cancel, Escape, lost capture and layout changes restore the expected checkpoint and do not corrupt history. |
| B05 | Labels | Screen basis changes only labels; anatomical IDs, source texture, weights, pose and saved selection remain unchanged. Crossed/overlapping nodes receive truthful location labels. |

For every B test, record requested displacement, accepted displacement, target error and limiting reason. Showing zero displacement on every request is not a direction-fix pass. Select targets reachable under the current limits as positive controls; use unreachable targets separately as negative controls.

## C. Registration and illustrated deformation

| ID | Required check | Pass condition |
|---|---|---|
| C01 | Reference reconstruction | At each packet's actual source pose/camera, reproduce the selected drawing's intended proportions and registration; no blanket resize to an unrelated pose. |
| C02 | Same pose across views | Pose one arm, switch front → compatible three-quarter → profile → front. Persistent driver transforms and selected anatomical ID do not change. |
| C03 | Real artwork movement | With all overlays hidden, the bound arm changes when its driver changes in every claimed supported view. A static replacement drawing is not a pass. |
| C04 | Local ownership | Arm/wrist movement does not move trousers, opposite limbs or unrelated torso pixels. Confirm with regional masks as well as screenshots. |
| C05 | Weights | Finite, nonnegative, normalized weights; permitted local influences only; no unweighted active vertices or guessed ID remapping. Heatmaps reflect the same numeric binding used for the artwork. |
| C06 | Attachments and correctives | Shoulder, wrist, waist, hip, knee and ankle connections remain visually intact in tested supported states. Checks include actual alpha/silhouette, not only coincident hidden vertices. |
| C07 | Occlusion | Depth-informed layer ownership does not make whole arms pop incorrectly in front/behind. Test hand across torso and bent elbow; document unsupported overlap combinations. |
| C08 | Projection vs strain | Changing camera alone leaves driver acceptance and pre-projection structural measurements unchanged. Art-specific checks account for expected foreshortening. |
| C09 | Coverage | Unsupported views/poses are explicit and retain the persistent pose. Do not silently mirror, stretch a front plate, reset pose, or present a nearby view as the exact requested one. |

Set numerical tolerances with a named calibration/profile and record why they are appropriate. Do not weaken them until old demonstrations appear to pass. Artist/user review of representative silhouettes is a separate sign-off.

## D. Clipping, alpha and source approval

| ID | Required check | Pass condition |
|---|---|---|
| D01 | Existing QC flags | Known outer/internal clipping, missing target and neighbouring fragments block automatic full-body binding. No matching by title instead of hash. |
| D02 | Native source inspection | Examine internal panels, buns, both hands, toes, heels and clothing extremities—not just the outer canvas border. Intentional detail crops remain region-specific. |
| D03 | Render/export framing | Entire intended visible artwork fits the tested preview and exported PNG; masking and viewport clipping do not hide missing anatomy. Test mobile as well as desktop. |
| D04 | Alpha preservation | Inspect dark, light and checker backgrounds. No blue islands removed from skin, white halos, erased highlights or accidental interior holes. A blue/RGB source plate is not an alpha asset. |
| D05 | Variant consistency | Preserve source-approved/ref labels and chosen outfit family. Do not silently change back panels, shoe hardware or eye orientation between views. |

## E. Persistence, safety and delivery

| ID | Required check | Pass condition |
|---|---|---|
| E01 | Snapshot round trip | Export and reimport pose, camera, selection, label preference, packet selection, landmark edits, weights and attachment metadata. Missing resources are detected, not silently replaced. |
| E02 | Real-origin restart | On a stable origin, save → close/reopen → restore. Test denied/unavailable storage and display failure honestly. `set_content` does not establish this pass. |
| E03 | Legacy migration | Old valid 0.1.2 package restores the original behavior. Unknown rig/topology and malformed weights are rejected without changing live state. |
| E04 | Hostile input | Imported guide/catalog scripts, URLs and event handlers never execute. Oversized files, invalid JSON, nonfinite coordinates, checksum mismatches and invalid IDs fail visibly. |
| E05 | Exact release artifact | Rebuild HTML and integrated runtime from the tested source; record their hashes. Run browser tests against those bytes. No stale compiled release. |
| E06 | Scope report | Distinguish standalone/subsystem tests from full Vite/React integration and emulated touch from physical hardware. Historical reports stay labelled historical. |

## Minimum first-release demonstration

A real browser session should show: open the existing interface; import/select a clean candidate from the corrected catalog; register the chosen arm; move it without reverse input or unrelated surface drag; change among three declared supported views without altering the pose; inspect the actual weights; edit one registration landmark without changing the skeleton; export and reopen; reproduce that pose and binding. Include dark/light/checker captures and a known-clipped-source rejection.

Do not announce completion of all-angle posing when only this three-view slice passes. Report the remaining gaps explicitly and proceed to additional packets in a subsequent controlled change.
