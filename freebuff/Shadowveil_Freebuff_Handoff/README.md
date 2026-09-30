# Freebuff handoff — Shadowveil

Open this folder as the handoff workspace, then paste the contents of **START_HERE_FREEBUFF.txt** into Freebuff. The detailed task is in **FREEBUFF_HANDOFF.md**; required demonstrations are in **ACCEPTANCE_TESTS.md**.

**Use Screen Labels 0.1.2, not Workbench.** This is a handoff package, not an updated driver release. Nothing here automatically activates a route or changes your existing app.

| Folder/file | Contents |
|---|---|
| `baseline/` | Exact user-selected Screen Labels HTML; preserve this reference. |
| `driver-source/` | 92 unchanged files from the matching source add-on; make a working copy before editing. |
| `references/` | Correct original master-sheet HTML, thin catalog index, QC registry and unbound registration shortlist. |
| `prior-reports/` | Historical notes, QC comparison and baseline verification; the 0.1.1 comparison HTML is for regression testing only. |
| `evidence/` | New handoff input-integrity audit, explicitly not a posing test. |
| `tools/` | Read-only package verifier and original-art extractor. Requires Python 3.9 or newer; no third-party packages. |
| `PACKAGE_MANIFEST.json` | Sizes and SHA-256 hashes for all delivered files except this manifest itself. |

Verify before development:

```sh
python tools/verify_bundle.py
```

Inspect the catalog metadata without loading 61 MB of HTML/base64 into the agent's context:

```text
references/catalog-index.json
```

Extract only selected original images, with no repainting or transparency changes:

```sh
python tools/extract_art.py --asset e0628ddf8c351b3b9425 --asset 48ba4faf9045baac59c6 --asset cff7d8f7da882463c78b
```

These IDs identify F-01, F-02 and F-03 source drawings. They are review candidates, not an assertion that their poses or costume details already form a calibrated rig.

The full catalog contains 230 labels/entries, 190 unique original images and 20 groups. QC status is separate from source approval. The delivered extractor preserves every selected image's exact bytes.

The source add-on is not the complete original application. It contains an independent build path and optional React adapter; the host application's original dependencies are not recreated here. Follow the detailed handoff before changing an existing project.
