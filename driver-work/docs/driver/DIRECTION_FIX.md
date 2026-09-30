# Shadowveil — Foundation 0.1.1: direction and node-input correction

This is a targeted control-system correction to the hidden 3D driver. The displayed character remains the existing 2D artwork. It is not a newly approved anatomy rig, a design change, or a finished all-angle character.

## Open the corrected editor

Open `Shadowveil_Character_Driver_Direction_Fix.html` in a browser that executes HTML. The header reads **CHARACTER DRIVER · FOUNDATION 0.1.1 · DIRECTION FIX**. The same bytes are included as `Shadowveil_Character_Driver_Foundation.html` in the source add-on, to keep the existing build path stable.

Enable **Driver overlay** to expose nodes and the selected rotation ring. Choose **Place nodes / rotate ring** rather than Orbit camera.

## Defects found in the 0.1 input handler

1. Every non-root horizontal drag was converted to `localZ = initialZ - dx * 0.3`. It ignored the camera, current parent rotation, vertical pointer movement and the selected joint's role. One fixed sign is not a screen-space positioning rule.
2. Dragging a joint rotated the bone *whose origin was that joint*. The node itself stayed put, while its descendants swung around it—sometimes opposite to the pointer. For example, the old negative-control test confirms that dragging an anatomical-right elbow rightwards left that elbow stationary and moved its wrist leftwards.
3. The root-drag camera inverse composed pitch and yaw in the wrong order for simultaneous rotations. It was not the exact inverse of the drawing projection.
4. Anatomical labels did not clearly state the node's present screen side. In addition, a shoulder and its coincident clavicle could select by iteration order rather than by the current selection.

These are input/mapping problems, not reasons to mirror the artwork or swap anatomical bone IDs.

## Implemented changes

### Camera-space node placement

The new `src/lib/puppet/driver/controls.ts` is shared by projection, picking and direct manipulation. A grab stores the current pose, camera, joint location and CSS-pixel scale. Pointer deltas are relative to that grab; the initial pointer-to-node offset is preserved.

The root uses the exact inverse of `project3`: reverse the pitch rotation, then reverse the yaw rotation. Zoom is included once through the viewport fit, and device-pixel ratio is not mistakenly applied to CSS pointer coordinates.

For other nodes, a bounded positional solver adjusts the relevant ancestor chain. A wrist node places the wrist through its arm chain; it does not merely rotate the hand around an immovable wrist. Elbow and knee node placement similarly operates through their parent limb. Bone lengths and rest positions are never changed.

This is a camera-plane target solver with a weak depth preference, not a full-body dynamics or contact solver. A shoulder socket is attached to the torso; moving that socket operates through the parent torso chain. Use the rotation ring for independent arm swing. The provisional coincident clavicle/shoulder calibration is not redesigned in this patch.

### Separate rotation control

The dashed gold ring rotates the selected bone around its actual current pivot. Clockwise screen movement is converted into a camera-normal world rotation and then into the current parent's local space. The ring uses an angular grab offset, not absolute screen X.

The advanced XYZ sliders remain explicitly **local-axis angles**. Increasing a local angle is not labeled as a screen-left or screen-right command.

### Explicit screen directions and anatomical identity

The inspector now identifies both meanings, for example:

`Her right · Wrist · screen-left`

Anatomical IDs remain stable when the camera turns. In front view her right is normally on the left side of the screen; behind her, the same anatomical right joint normally appears on the right. The artwork and weight assignments are not mirrored or relabeled.

Left, Right, Up and Down buttons operate in screen coordinates. Arrow keys do the same while the canvas is focused (5 CSS-pixel requests, or 1 with Shift). Limits can shorten those requests.

A selected joint has priority when projected nodes coincide. The shoulder and clavicle remain independently selectable from the existing inspector.

### Limits, cancellation and persistence

Existing angular and weighted-surface envelopes are retained. The final accepted candidate is checked again for reversed screen displacement after surface limiting. A blocked target is reported; the editor does not intentionally reverse a drag to satisfy it. A target marker indicates a constrained result.

Returning the pointer to its original grab location restores the accepted starting pose exactly. Escape, touch cancellation, lost capture, or a changed viewport layout cancel the gesture rather than accumulating an offset. Only the active primary pointer controls a gesture. A cancelled gesture does not leave an extra pose edit in undo history.

The project schema, rig revision, bone IDs, calibration, numerical weights, guide importer and seed asset-set identity are unchanged. Export/reimport with the revised application was exercised. Browser-origin reload persistence and native Android attachment handling remain unverified.

## Actual validation

- Strict TypeScript compilation through `node scripts/build-driver.mjs`.
- **47 numerical/document tests passed:** 26 retained foundation tests and 21 additional direction/control regressions. The new suite includes an explicit negative control for the old inversion, exact camera inverse, screen direction and zoom, parent rotations, reachable targets, bounded extreme requests, fixed lengths, rotation-ring signs, stable identities and coincident-node picking.
- **29 existing browser regressions passed.**
- **49 new browser checks passed**, using the exact delivered HTML in Chromium. Actual mouse events tested both wrists in all four directions in front and left/right at angled, side and back cameras. Actual emulated mobile touch tested both anatomical sides, changed zoom, cancellation and non-unit device-pixel ratio. Root diagonals, clockwise ring rotation, offset grabs, keyboard/buttons, return-to-origin, labels and portable project export/reimport were also checked.
- **20 seed asset files are byte-for-byte unchanged**, including artwork, atlas and numerical weights. The generated asset-set bundle is identical to the original foundation bundle.

The browser reports record signed requested versus actual movement, whether constraints shortened the request, and the delivered HTML's SHA-256. Screenshots are Chromium captures, not recreated interfaces. Angular views outside the existing front-art range were tested on the driver overlay only; no side/back artwork support is asserted.

These finite tests establish the measured input behavior. They do not certify every possible pose, natural anatomy, physical Android performance, or a fresh full React/Vite production build. The existing rasterizer and constraint checks may still be costly on a phone.

## Applying the source update

Back up the existing project and extract `Shadowveil_Driver_Direction_Fix_Source.zip` into its root, preserving paths. The source package is an add-on, not a replacement dependency manifest.

If the foundation route is already active, replacing its compiled modules and public files supplies the correction. To activate the route or refresh the build/test scripts explicitly:

```sh
node scripts/activate-driver.mjs
npm run driver:build
npm run driver:test
```

The activation script backs up `Studio.tsx` and `package.json` before changing anything, preserves dependencies, and is a no-op when the desired route and scripts are already in place.

Without activating the original application's route:

```sh
node scripts/build-driver.mjs
node --test tests/driver/core.test.mjs tests/driver/direction.test.mjs
python tests/driver/browser-check.py
python tests/driver/direction-browser.py
```

Browser tests require Python Playwright and Chromium. They load the actual HTML using `set_content` because this environment blocks normal URL navigation. TypeScript is the only compiler needed by the isolated build. No API keys are used.

## Still awaiting the definitive guide

Meta AI's definitive guide has not been supplied or approved here. This patch does not change provisional body proportions, generate new artwork, fit a volumetric guide, reintroduce foot pinning, or complete all-angle registration. It fixes input direction and clarifies the distinction between moving a node and rotating a bone while retaining the current hidden-driver architecture.

## Technical references

Conceptual API documentation, not a claim that these external libraries are bundled:

- MDN MouseEvent.clientX: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX
- MDN Element.setPointerCapture: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
- Three.js Vector3 projection/unprojection: https://threejs.org/docs/pages/Vector3.html

The camera inverse and positional solver in this patch are dependency-free implementation code.
