import { validLabelBasis } from './labels.js';
import { sha256Text } from "./sha256.js";
import { provisionalRig, neutralDriver, constrainPose, validateRig } from './driver.js';
import { ARM_PACKETS } from './arm-views.js';
export const PROJECT_SCHEMA = 'character-driver-project/1';
export const GUIDE_SCHEMA = 'character-driver-guide/1';
export const GUIDE_LIMIT = 12 * 1024 * 1024;
const now = () => new Date().toISOString();
const uuid = () => globalThis.crypto?.randomUUID?.() ?? ('project-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
export function firstBatch() {
    return ['front', 'three-quarter-R', 'profile-R'].flatMap(view => {
        const master = 'sv.neutral.' + view;
        return [
            { id: master, kind: 'neutral', view, side: 'whole', status: 'awaiting-guide', dependsOn: ['approved-guide'], specification: 'Same approved neutral registration, full body; no redesign, no automatic mirroring.' },
            { id: 'sv.arm.R.raised.' + view, kind: 'arm-correction', view, side: 'R', status: 'awaiting-guide', dependsOn: [master], specification: 'Anatomical right shoulder/elbow correction against a saved hidden-driver pose; preserve attachment landmarks.' },
            { id: 'sv.hand.R.open.' + view, kind: 'hand', view, side: 'R', status: 'awaiting-guide', dependsOn: [master], specification: 'Open palm with the approved wrist alignment, scale and finger anatomy; separate drawable layer.' },
            { id: 'sv.underarm.R.' + view, kind: 'concealed', view, side: 'R', status: 'awaiting-guide', dependsOn: [master, 'sv.arm.R.raised.' + view], specification: 'Completed concealed shoulder/underarm and sleeve overlap. Not a crop of visible pixels only.' }
        ];
    });
}
export function authoredArm() {
    return { id: 'arm-r-views-1', bones: ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'], packets: structuredClone(ARM_PACKETS), status: 'authored' };
}
export function createProject(assetSetId, sourceHash) { const driver = provisionalRig(), stamp = now(); return { schema: PROJECT_SCHEMA, id: uuid(), characterId: 'shadowveil', name: 'Shadowveil · driver project', revision: 0, createdAt: stamp, updatedAt: stamp, assetSetId, driver, pose: neutralDriver(driver), registration: { id: 'legacy-front-pilot', driverRevision: driver.revision, sourceHash, status: 'provisional', approvedGuideHash: null }, workspace: { camera: { yaw: 0, pitch: 0, zoom: 1 }, selectedBone: 'forearm-R', showDriver: false, diagnostic: 'art', background: 'dark', interaction: 'pose', labelBasis: 'screen' }, guides: [], activeGuideId: null, queue: firstBatch(), savedPoses: [], catalog: null, armRegistration: authoredArm() }; }
export function revise(d, edit) { const n = structuredClone(d); edit(n); n.revision = d.revision + 1; n.updatedAt = now(); return n; }
export async function shaText(text) {
    if (!globalThis.crypto?.subtle)
        return sha256Text(text);
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(h)].map(n => n.toString(16).padStart(2, '0')).join('');
}
function safeString(v, max, label) {
    if (typeof v !== 'string' || v.length > max)
        throw new Error('Invalid ' + label);
    return v;
}
/** Strict optional data block. No HTML nodes are attached, scripts evaluated, or URLs fetched. */
export function validateGuideMeta(raw) {
    if (!raw || typeof raw !== 'object')
        throw new Error('Guide metadata must be an object');
    const m = raw;
    if (m.schema !== GUIDE_SCHEMA || m.characterId !== 'shadowveil')
        throw new Error('Unknown guide schema or different character');
    const out = { schema: GUIDE_SCHEMA, characterId: 'shadowveil', revision: safeString(m.revision, 100, 'guide revision'), notes: safeString(m.notes ?? '', 8000, 'guide notes') };
    if (m.landmarks) {
        if (m.units !== 'bind-pixels' || m.coordinates !== 'x-image-right_y-up_z-front')
            throw new Error('Landmarks require explicit supported units and axes');
        out.units = m.units;
        out.coordinates = m.coordinates;
        out.landmarks = {};
        const ids = new Set(provisionalRig().bones.map(b => b.id));
        for (const [id, p] of Object.entries(m.landmarks)) {
            if (!ids.has(id) || !p || [p.x, p.y, p.z].some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 2000))
                throw new Error('Invalid driver landmark ' + id);
            out.landmarks[id] = { x: p.x, y: p.y, z: p.z };
        }
    }
    return out;
}
const attr = (attrs, key) => { const m = new RegExp('\\b' + key + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(attrs); return m?.[1] ?? m?.[2] ?? m?.[3] ?? ''; };
/** This is a text-only extractor, not a sanitizer. Original guide is archived inert. */
export async function inspectGuideHTML(html, name) {
    if (new TextEncoder().encode(html).length > GUIDE_LIMIT)
        throw new Error('Guide exceeds 12 MiB');
    if (!/<(?:html|body|h[1-6]|div|section|!doctype)\b/i.test(html))
        throw new Error('Expected an HTML guide');
    let machine = null, metadataWarning = 'No optional structured block. Retained as a visual reference; manual registration is required.';
    const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m => attr(m[1], 'id') === 'character-driver-guide' && attr(m[1], 'type').toLowerCase() === 'application/json');
    if (blocks.length > 1)
        metadataWarning = 'Multiple structured guide blocks. No numerical metadata imported.';
    else if (blocks.length === 1) {
        try {
            machine = validateGuideMeta(JSON.parse(blocks[0][2]));
            metadataWarning = 'Structured metadata staged. No fitting or rig changes have been applied.';
        }
        catch (e) {
            metadataWarning = 'Structured block not applied: ' + String(e);
        }
    }
    const stripped = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const title = (/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? name).replace(/<[^>]*>/g, '').slice(0, 200);
    const hash = await shaText(html);
    return { id: 'guide-' + hash.slice(0, 20), name: safeString(name, 200, 'filename'), sha256: hash, html, title, summary: stripped.slice(0, 12000), machine, metadataWarning, status: 'staged', receivedAt: now() };
}
export function stageGuide(d, g) {
    if (d.guides.some(q => q.sha256 === g.sha256))
        throw new Error('This exact guide is already in this project');
    if (d.guides.length >= 3)
        throw new Error('This foundation supports up to three archived guide revisions. Export a checkpoint first.');
    return revise(d, n => { n.guides.push(structuredClone(g)); });
}
export function approveGuide(d, id) {
    const g = d.guides.find(g => g.id === id);
    if (!g)
        throw new Error('Guide not found');
    if (d.activeGuideId === id)
        return structuredClone(d);
    return revise(d, n => {
        for (const q of n.guides)
            q.status = q.id === id ? 'approved' : 'staged';
        n.activeGuideId = id;
        n.registration.status = 'needs-review';
        n.registration.approvedGuideHash = g.sha256;
    });
}
/** Import validation is intentionally closed to this provisional rig revision. A future
 * migration can explicitly add revised proportions. Never silently rebind an old mesh. */
export async function validateProject(raw, assetSetId, sourceHash) {
    if (!raw || typeof raw !== 'object')
        throw new Error('Invalid project');
    const d = raw;
    if (d.schema !== PROJECT_SCHEMA || d.characterId !== 'shadowveil' || d.assetSetId !== assetSetId)
        throw new Error('Project/schema/asset-set mismatch');
    validateRig(d.driver);
    const expected = provisionalRig();
    if (JSON.stringify(d.driver) !== JSON.stringify(expected))
        throw new Error('Driver calibration changed: explicit re-registration is required');
    safeString(d.id, 100, 'project ID');
    safeString(d.name, 200, 'project name');
    safeString(d.createdAt, 60, 'creation date');
    safeString(d.updatedAt, 60, 'update date');
    if (!Number.isSafeInteger(d.revision) || d.revision < 0)
        throw new Error('Invalid revision');
    const con = constrainPose(d.driver, d.pose);
    if (con.reasons.length)
        throw new Error('Imported pose exceeds driver envelopes');
    const w = d.workspace;
    if (!w || !d.driver.bones.some(b => b.id === w.selectedBone) || !['art', 'weights', 'seams'].includes(w.diagnostic) || !['dark', 'light', 'checker'].includes(w.background) || !['pose', 'orbit'].includes(w.interaction) || typeof w.showDriver !== 'boolean')
        throw new Error('Invalid workspace');
    if (w.labelBasis !== undefined && !validLabelBasis(w.labelBasis))
        throw new Error('Invalid label basis');
    for (const [key, range] of Object.entries({ yaw: [-180, 180], pitch: [-60, 60], zoom: [.5, 1.5] })) {
        const n = w.camera[key];
        if (!Number.isFinite(n) || n < range[0] || n > range[1])
            throw new Error('Invalid camera');
    }
    if (!d.registration || d.registration.id !== 'legacy-front-pilot' || d.registration.sourceHash !== sourceHash || d.registration.driverRevision !== d.driver.revision || !['provisional', 'needs-review'].includes(d.registration.status))
        throw new Error('Registration identity mismatch');
    if (!Array.isArray(d.guides) || d.guides.length > 3)
        throw new Error('Invalid guide history');
    const verified = [];
    for (const g of d.guides) {
        const fresh = await inspectGuideHTML(g.html, g.name);
        if (fresh.sha256 !== g.sha256 || fresh.id !== g.id || !['staged', 'approved'].includes(g.status))
            throw new Error('Guide identity mismatch');
        fresh.receivedAt = safeString(g.receivedAt, 60, 'received date');
        fresh.status = g.status;
        verified.push(fresh);
    }
    if (new Set(verified.map(g => g.id)).size !== verified.length)
        throw new Error('Duplicate guide');
    const active = verified.find(g => g.id === d.activeGuideId);
    if (d.activeGuideId !== null && (!active || active.status !== 'approved' || d.registration.status !== 'needs-review' || d.registration.approvedGuideHash !== active.sha256))
        throw new Error('Guide approval/registration mismatch');
    if (d.activeGuideId === null && (verified.some(g => g.status === 'approved') || d.registration.approvedGuideHash !== null || d.registration.status !== 'provisional'))
        throw new Error('Invalid guide approval');
    if (JSON.stringify(d.queue) !== JSON.stringify(firstBatch()))
        throw new Error('Unrecognized production queue: generation/approval is not implemented in this foundation');
    if (!Array.isArray(d.savedPoses) || d.savedPoses.length > 24)
        throw new Error('Invalid pose library');
    const saved = d.savedPoses.map(p => {
        safeString(p.id, 100, 'pose ID');
        safeString(p.name, 120, 'pose name');
        if (p.driverRevision !== d.driver.revision || constrainPose(d.driver, p.pose).reasons.length)
            throw new Error('Saved pose calibration/limit mismatch');
        return structuredClone(p);
    });
    const out = createProject(assetSetId, sourceHash);
    Object.assign(out, { id: d.id, name: d.name, revision: d.revision, createdAt: d.createdAt, updatedAt: d.updatedAt, pose: structuredClone(d.pose), registration: structuredClone(d.registration), workspace: structuredClone(w), guides: verified, activeGuideId: d.activeGuideId, savedPoses: saved });
    out.workspace.labelBasis = w.labelBasis ?? 'screen';
    const rec = d;
    out.catalog = Object.prototype.hasOwnProperty.call(d, 'catalog') ? validateCatalog(rec.catalog) : null;
    out.armRegistration = Object.prototype.hasOwnProperty.call(d, 'armRegistration') ? validateArm(rec.armRegistration) : null;
    return out;
}
function validateCatalog(raw) {
    if (raw == null)
        return null;
    if (raw.kind !== 'catalog-index' || raw.entries !== 230 || raw.assets !== 190 || raw.groups !== 20)
        throw new Error('Catalog summary mismatch');
    if (raw.binding !== 'reference_available' && raw.binding !== 'needs_review')
        throw new Error('Invalid catalog binding');
    if (raw.selectedAssetId != null && (typeof raw.selectedAssetId !== 'string' || raw.selectedAssetId.length > 80))
        throw new Error('Invalid catalog selection');
    return { kind: 'catalog-index', entries: 230, assets: 190, groups: 20, sha256: raw.sha256 ?? null, selectedAssetId: raw.selectedAssetId ?? null, binding: raw.binding };
}
function validateArm(raw) {
    if (raw == null)
        return null;
    if (raw.id !== 'arm-r-views-1' || raw.status !== 'authored' || !Array.isArray(raw.packets) || raw.packets.length !== 3)
        throw new Error('Invalid arm registration');
    if (raw.packets.map(p => p.assetId).join() !== ARM_PACKETS.map(p => p.assetId).join())
        throw new Error('Arm packet identity mismatch');
    for (const p of raw.packets) {
        for (const k of ['shoulder', 'elbow', 'wrist', 'tip']) {
            if (!p[k] || !Number.isFinite(p[k].x) || !Number.isFinite(p[k].y) || Math.abs(p[k].x) > 2000 || Math.abs(p[k].y) > 2000)
                throw new Error('Invalid arm landmark');
        }
        if (!Number.isFinite(p.radius) || p.radius < 8 || p.radius > 40)
            throw new Error('Invalid arm radius');
        if (typeof p.sha256 !== 'string' || p.sha256.length !== 64)
            throw new Error('Invalid arm hash');
    }
    return structuredClone(raw);
}
