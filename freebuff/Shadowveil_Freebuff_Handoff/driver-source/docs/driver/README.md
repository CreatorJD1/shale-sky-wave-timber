> Historical Foundation 0.1 notes. For the corrected 0.1.1 interaction, read `DIRECTION_FIX.md` or the root `README_DRIVER_FOUNDATION.md`. The horizontal-drag FK behavior below has been superseded.

# Shadowveil — Character Driver Foundation 0.1

**This is a foundation milestone, not an approved final rig or a new design lock.**
The definitive HTML guide being prepared in Meta AI has not been supplied. No new artwork was generated in this pass. Existing v5 images and numeric weights are seed assets, explicitly marked provisional.

## What runs now

Open `Shadowveil_Character_Driver_Foundation.html` in a browser that executes HTML. Code, current 2D images and weights are embedded. There are no external network requests or API keys.

- A real hierarchical **21-bone 3D driver**, with quaternion rotations, drives the existing 2D artwork through numerical bindings. It is not an animated skeleton over a static image.
- The driver has independent XYZ rotations and a separately saved orthographic camera. Orbiting does not modify the pose, bone lengths or surface measurements.
- The visible character remains **2D textured triangle artwork**, rendered through the existing v5 premultiplied-alpha rasterizer. No shaded or textured 3D character model is introduced.
- The driver overlay is off by default. Artwork, weights and shared seams occupy the same viewport, with one contextual inspector.
- Pose state, selected joint, camera, seed-art identity, staged guides and a 12-asset production queue are part of a versioned character document.
- A portable checksummed project export embeds the actual seed images and numerical weight file, not only paths to missing files. Export/reimport was exercised through a real browser download.
- Guide import stages an HTML document as inert reference text. Optional machine metadata is parsed as JSON. Guide code and remote resources are never executed or loaded by the importer.
- Explicit guide approval marks old artwork bindings **needs-review**. It does not silently modify the skeleton, fit proportions or claim newly approved registration. Undo restores the preceding checkpoint.

## What is deliberately provisional

The seed rest positions come from the current v5 calibration, converted to a right-handed coordinate system:

- X: image right / the character's anatomical left in front view.
- Y: up.
- Z: toward the front observer.
- Units: the existing 512 × 1100 registration's bind pixels, not centimeters.
- Origin: the legacy root point at image coordinate (258.8, 527).

The seed rest pose is initially planar (Z = 0). Local rotations produce actual three-dimensional positions and foreshortening, but the **depth proportions are not authoritative anatomy**. The forthcoming guide and registration pass must establish them. A finalized volumetric cage has not yet been fitted.

The existing weights are lifted into this provisional driver; that is not artist-approved all-angle skinning. Stored v5 corrective masks remain in the archived source data, but the pilot does not apply the old screen-plane correctives after the new 3D transform. Doing so without registration would double-deform or misapply them. Full view-aware corrective authoring remains a later stage.

## Views and missing coverage

The existing front drawing is enabled only in a small pilot viewing envelope (yaw ±12°, pitch ±8° and small out-of-plane bone rotations). These values are temporary coverage rules, not natural human motion limits and not approval of every image in that range.

Outside that envelope, the editor withholds the drawing and reports **Registered artwork unavailable**. Enable Driver overlay to inspect the retained 3D pose. Returning front restores the same pose. It does not substitute a static side drawing, mirror asymmetric art or pretend to synthesize unseen surfaces.

The side/back camera controls are useful driver inspection positions; they are **not finished directional artwork support**. Per-part variant selection, registered transitions and concealed-surface replacement remain to be implemented after the guide and first art batch.

## Input and protection

The foundation has FK controls: choose a joint, adjust a local axis, or enable Driver overlay and drag a joint horizontally for image-plane rotation. In Orbit mode, drag the viewport to orbit. Pelvis dragging translates the root in the camera plane. There is no new full 3D hand IK, foot pinning, finger rig or complete anatomical collision solver in this milestone.

Quaternion state is normalized and validated. Provisional individual envelopes and a combined spine envelope are camera-independent. Surface checks measure the actual bound geometry in 3D before projection; expected camera foreshortening does not become false compression. Failed surface requests are bounded back toward the preceding accepted state.

The initial global pilot bounds (0.6×–1.5× local scale, attachment separation at most 0.03 bind pixels) are conservative engineering checks, not human tissue thresholds. Endpoint checking and refinement do not prove continuous collision avoidance or natural anatomy. The old v5 solver and its controls are retained in the source; the new pilot should not be represented as feature-equivalent to v5.

## Definitive guide workflow

1. Import the real completed HTML, not the handoff document or a test fixture.
2. Review its title, stored revision, text and optional machine-data warnings. The imported HTML is archived; the runtime does not execute its interactive scripts or render its arbitrary DOM.
3. Export a project checkpoint before approval.
4. Approve the reference only when its design decisions are accepted. The seed art then becomes **needs-review** and is withheld until the future registration-authoring step is completed.
5. Fit/verify driver proportions against the guide, register the approved art and rebake bindings. That registration-authoring workflow is **not implemented yet** in this foundation.

The current importer supports ordinary HTML as reference-only. An optional `application/json` script block named `character-driver-guide` supports the documented metadata contract. The block cannot automatically change rig hierarchy or units. Unrecognized metadata is flagged and left unapplied. SHA-256 identifies the UTF-8 text returned by the browser's file reader, not a cryptographic endorsement of the guide's author or correctness.

No generation job starts when a guide is imported or approved. The first 12 tasks are planning records and remain awaiting guide plus registration proof. Approval is not a claim that an asset has been generated, rigged or visually accepted.

## Persistent project versus autosave

`Export project` writes `Shadowveil.character.json`. It contains a checksum wrapper around the project and resources. Imports verify the checksum, asset-set identity, guide identities, driver revision, limits and bound surface before replacing live state. A checksum catches accidental corruption; it is not a digital signature or proof of trust.

This foundation intentionally rejects a different topology, changed seed driver or unrelated asset set. A future explicit migration/rebinding step will allow those changes. It never silently assigns old vertex weights to a different mesh.

IndexedDB autosave is implemented with a stable database name and transaction-completion acknowledgements. It needs a supported, stable browser origin. The runtime displays a failure rather than pretending a save succeeded. Prefer the integrated app or the local server over relying on a phone's attachment preview:

```sh
python scripts/serve-driver.py
```

Open the printed localhost address on the computer running the server. This loopback-only helper does not publish the app to your phone or the internet. Do not rely on browser storage as the sole backup; export the project.

In this execution environment, managed Chromium blocks URL navigation. **Actual IndexedDB save/reload across an origin was not verified.** Portable project export/reimport, including exact pose/camera/selection restoration, was verified. Physical Android behavior and local HTML file associations were not tested.

## Integrating with the existing project

The add-on uses the actual supplied v5 subsystem, rather than inventing new source paths:

- New TypeScript: `src/lib/puppet/driver/`.
- Existing rasterizer extension: `src/lib/puppet/pose-v5/surface.ts` accepts an optional externally projected vertex buffer. Default v5 calls remain unchanged.
- New React component: `src/components/puppet/DriverFoundation.tsx`.
- Compiled runtime and embedded seed assets: `public/driver-foundation/`.
- New TypeScript configuration: `tsconfig.driver.json`.

Extract the source add-on **into the existing project root**. It does not contain a replacement dependency list or a replacement `Studio.tsx` by default. Preview `/driver-foundation/` through your existing server, or use the standalone HTML first.

To explicitly activate it at the existing Studio route:

```sh
node scripts/activate-driver.mjs
npm run driver:build
npm run driver:test
npm run dev
```

The activation script backs up the current `Studio.tsx` and `package.json` under `driver-backup/`, adds only the new build/test scripts, and changes Studio to mount `DriverFoundation`. It does not delete older pose directories. Restore that backup to return the route to v5.

To build without activating the route (with TypeScript installed):

```sh
node scripts/build-driver.mjs
node --test tests/driver/core.test.mjs
```

The build uses the installed TypeScript compiler API. It bundles the same modules in isolated CommonJS-style factories for the offline HTML; it does not flatten unrelated module scopes or use a CDN.

## Verified in this pass

- Strict TypeScript compilation of the driver and its imported v5 subsystem.
- **26 numerical/document tests:** quaternion round trips, DQ identity/translation, hemisphere alignment, hierarchy identity, fixed bone lengths through 150 configurations, actual depth, camera independence, neutral binding reconstruction, welded attachments, malformed inputs, guide parsing and invalidation, project identity, and SHA-256 fallback comparisons against Node.
- **29 Chromium browser checks:** actual artwork changes from 3D rotations, preserved pose during camera changes, missing-view warnings, diagnostic modes, real project file download/reimport, malformed-project rejection, inert hostile-HTML test fixture, approval/undo behavior, mobile layout and actual emulated touch events.
- The tests execute the delivered HTML using `set_content`; screenshots are browser captures, not painted substitutes. The report records its SHA-256.
- The unavailable-storage path is tested honestly; no browser-origin persistence pass is asserted.

The checks are measured software behavior, not artistic approval of every possible pose. The full Vite/TanStack/server build and React-mounted production route were not freshly end-to-end built here.

## Next gated milestone

Receive and approve the actual definitive guide; resolve proportion/axis/appearance conflicts; then build the first anatomical-right-arm registration proof across front, right three-quarter and right profile. Only after that proof should the planned art library expand toward the discussed ~180 approved drawings. This release contains **zero new generated drawings**.

### Technical references

- IndexedDB structured storage and same-origin behavior: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- DOMParser caveats (why the importer never inserts arbitrary parsed HTML): https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
- Quaternion orientation convention background: https://threejs.org/docs/pages/Quaternion.html

These are reference documentation. The new driver math is dependency-free; it does not bundle Three.js.
