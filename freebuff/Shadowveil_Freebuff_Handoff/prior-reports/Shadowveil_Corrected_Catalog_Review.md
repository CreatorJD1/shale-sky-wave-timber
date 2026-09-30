# Shadowveil — corrected catalog reconciliation and clipping overlay

## Current source
The user supplied `Shadowveil_Interactive_Master_Sheet.html` as the correct list. It is now the basis of this derived QC catalog, replacing the limited recovered-MHT inventory for current selection. The uploaded HTML itself is unchanged.

Source version: `1.0-repaired`. SHA-256: `2820a063a7a58a9b945063bdd664d2854e7581057b389c7410e7645ee45e2d2e`.

## Verified inventory
- **230 source entries** and **190 byte-distinct embedded original image files**, in **20 reference groups**.
- Collections: **62 Chroma plates**, **50 Approved source sheet**, **118 Drive references** entries. These are source-entry counts, not additive unique image counts.
- **40 aliases** beyond one entry per unique file. Every source label is retained. Some aliases have different descriptive names (for example Triumphant and Wave3 neutral); no semantic relabeling or automatic expression assignment was performed.
- **190 embedded previews** decode successfully. All original images decode to **RGB**, without an alpha channel.
- All original file SHA-256 hashes, dimensions and byte counts match the catalog. No dangling asset references or unreferenced asset records were found.
- The 118 Drive-reference entries resolve to image payloads in this HTML. The live Drive folder was not queried or independently audited.

## Reconciliation with the previous QC
**66 files** are exact SHA-256 matches to the previous 76-file QC. **124 files** are newly included relative to that review.

The **10 keyed resource_10 through resource_19 sheet derivatives** from the old recovery are absent from this corrected list. Their six interior-key-damage and eight white-residue findings are not copied to unrelated new entries. Their absence is not a claim that the pixels were repaired; those older files remain historical records. Do not use the old MHT's missing-URL count to describe the new catalog.

Historical design differences on exact-matched images remain comparison notes, not an instruction to reject a listed outfit variant. The current HTML explicitly keeps variants separate. The original **50 Source-approved** and **180 Reference** entry statuses are unmodified. QC and runtime readiness are separate fields.

## Clipping and crop results
All 124 newly included pictures were visually triaged on full-image contact sheets, with suspect edge contacts, shoe details and internal head panels enlarged. Automated border/margin detection was used to find candidates, not as a final verdict. Prior QC carries forward only on exact source bytes.

| Outcome | Unique files |
|---|---:|
| Observed character/subject clipping | **12** (4 inherited + 8 newly logged) |
| Missing intended crop target | **1** |
| Neighbouring figure/caption fragments | **10** |
| Caption itself at a clipped edge (character intact) | **2** |
| Tight-margin / uncertain edge-contact notes | **12** |
| Intentional regional-detail framing | **23** |
| Files with any marked finding | **57** |

Counts overlap. Intentional detail cropping is not automatically a failure. A padded image can still have internal clipping; the head-sheet findings demonstrate that distinction. No logged clipping is not a guarantee of complete anatomy or perfect alpha.

### Inherited definite clipping
Dodge: screen-left foot. Jump: screen-left fist only; the screen-right fist remains a tight-margin note, not definite clipping. T-pose front and T-pose back: both outer arms/hands exceed the canvas.

### New definite clipping
- **C-02 · Lunging Forward** (`6614f303d3bb8c8370f9`): C-02: the trailing leg exits the screen-left edge; its foot is absent from this individual crop.
- **E-03 · Side Foreshortening** (`7250fb618cd50297ce58`): E-03: the top of the bun/hair is truncated at the upper image edge.
- **E-04 · Tilted Close** (`4be96677daab91251c25`): E-04: the upper bun is cut off at the top canvas boundary.
- **G-09 · Side Profile (Pixel-Exact)** (`b64c997e1b545a9c9cc6`): G-09: the shoe is cut off at the screen-right edge; this is not a complete side-profile shoe despite its source label.
- **G-10 · Front 3/4 (Pixel-Exact)** (`fa10b660276787c2af11`): G-10: the toe/forefoot extends beyond the screen-left edge. This is not just an intentional ankle crop.
- **5ac37c42 e233 43a3 a93c 4032a779a27d** (`110e544296517363ad7e`): The four head panels have flat-cut upper buns inside the padded sheet. Outer canvas margins do not protect these internal image cuts. Face regions may still be usable separately.
- **303ea726 fcff 4828 99a2 bba92c80130d** (`da3b9869026fffde75ea`): The four head panels have flat-cut upper buns inside the padded sheet. Outer canvas margins do not protect these internal image cuts. Face regions may still be usable separately.
- **814607864 1124029433651126 3563838812823439308 n** (`ce8dcb3b67c99c9b2848`): The rear heel/base is truncated at the screen-left edge of this small shoe crop.

### Crop problems distinct from missing anatomy
**G-11 · Back Heel (Pixel-Exact)** is largely blank space/caption with a partial strip, not a usable heel drawing. **C-01 · Combat Ready Stance** retains an extra foot at its screen-right edge even though its main figure is contained. E-01/E-02 keep fragments from the next row. These are source-crop/ownership issues; changing viewer CSS does not repair them.

The new source contains larger action, camera and shoe sheets that are candidates for recovering several broken individual crops. Candidate links are recorded in `data/registration_shortlist.json` as visual correspondences, not verified crop transforms or automatic substitutions.

## Updated viewer
`index.html` in the package preserves the source's groups, collections, names, IDs, status labels, comparison, favorites and original download tools. Added controls:
- QC filter: clipping/missing target, all marked findings, neighbour fragments, intentional details, margins, historical design differences, new files, exact matches.
- Original/marked toggle in the existing image viewer. Original is the default; original download never switches to a QC derivative.
- Numerical asset ID, full SHA-256 and all source aliases shown in the contextual QC section.
- Export QC registry separately from the unchanged source catalog export.

The standalone `Shadowveil_Corrected_Master_Sheet_QC.html` includes the same runtime and embedded files. The ZIP edition uses relative files; keep its directory structure intact. No second character rig or visible 3D model has been introduced.

## Preservation and validation
All **190 originals** and **190 previews** decode. All original bytes match the uploaded metadata. The standalone's original catalog-data JSON block is byte-for-byte unchanged. Marked copies and comparison sheets are separate derivatives and must not be used as replacement character art.

**33 browser checks passed** in two completed Chromium runs (26 desktop, 7 emulated mobile touch). They cover counts, source/alias preservation, filters, full-image fit, original-versus-marked viewing, original download preservation, exports, mobile width/taps, and no external requests or uncaught browser errors. These tests execute the delivered standalone, not the pose system. Physical Android, attachment associations and full driver registration are not tested.

## Scope remaining
This pass reconciles the corrected list and audits new clipping/crop suitability. It does not re-run exhaustive chroma/identity review for every new file; it does not alter the source-approved design, remove backgrounds, reconstruct hidden anatomy, repair crops, generate artwork or register views to the driver. The registration shortlist is unbound planning metadata, not a completed view packet.

Use a complete source-sheet region rather than a clipped individual crop for the subsequent preparation pass. Keep every source name and preserve provenance for any repaired derivative.
