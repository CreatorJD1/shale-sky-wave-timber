import { CALIBRATION } from '../pose-v5/calibration.js';
import { v3, plus, minus, norm3, rotate3, identityQ, fromXYZ, toXYZ, qMul, qSlerp, makeDQ, project3, metric3, transformWeighted } from './math3.js';
export const BIND_ORIGIN = { x: CALIBRATION.root.x, y: CALIBRATION.root.y };
export const fromBind = (v, z = 0) => v3(v.x - BIND_ORIGIN.x, BIND_ORIGIN.y - v.y, z);
export const toBind = (v) => ({ x: v.x + BIND_ORIGIN.x, y: BIND_ORIGIN.y - v.y });
export function provisionalRig() {
    const bones = [];
    const add = (id, label, parent, p, z = [-12, 12], xy = [-30, 30]) => bones.push({ id, label, parent, bind: fromBind(p), limits: { x: [...xy], y: [...xy], z: [...z] } });
    add('pelvis', 'Pelvis', null, CALIBRATION.root, [-8, 8], [-12, 12]);
    add('lumbar', 'Lower spine', 'pelvis', { x: BIND_ORIGIN.x, y: 443 }, [-12, 12], [-15, 15]);
    add('thorax', 'Upper spine', 'lumbar', { x: BIND_ORIGIN.x, y: 342 }, [-12, 12], [-15, 15]);
    add('cervical', 'Neck', 'thorax', { x: BIND_ORIGIN.x, y: 242 }, [-12, 12], [-20, 20]);
    add('head', 'Head', 'cervical', { x: BIND_ORIGIN.x, y: 212 }, [-18, 18], [-25, 25]);
    for (const s of ['R', 'L']) {
        const a = CALIBRATION[s], name = s === 'R' ? 'Right' : 'Left';
        add('clavicle-' + s, name + ' clavicle', 'thorax', a.shoulder, [-10, 10], [-15, 15]);
        add('upper-' + s, name + ' upper arm', 'clavicle-' + s, a.shoulder, s === 'R' ? [-70, 6] : [-6, 70], [-65, 65]);
        add('forearm-' + s, name + ' forearm', 'upper-' + s, a.elbow, s === 'R' ? [-95, 0] : [0, 95], [-10, 10]);
        add('hand-' + s, name + ' hand', 'forearm-' + s, a.wrist, [-22, 22], [-30, 30]);
        add('thigh-' + s, name + ' thigh', 'pelvis', a.hip, [-20, 20], [-30, 30]);
        add('shin-' + s, name + ' shin', 'thigh-' + s, a.knee, s === 'R' ? [0, 30] : [-30, 0], [-8, 8]);
        add('foot-' + s, name + ' foot', 'shin-' + s, a.ankle, [-16, 16], [-20, 20]);
        add('toe-' + s, name + ' forefoot', 'foot-' + s, { x: a.ankle.x, y: a.ankle.y + 53 }, [-10, 10], [-10, 10]);
    }
    return { revision: 'legacy-front-driver-1', units: 'bind-pixels', coordinates: 'x-image-right_y-up_z-front', status: 'provisional', bones };
}
export const neutralDriver = (rig) => ({ root: v3(), rotations: Object.fromEntries(rig.bones.map(b => [b.id, identityQ()])) });
export function validateRig(r) {
    if (r.units !== 'bind-pixels' || r.coordinates !== 'x-image-right_y-up_z-front' || r.bones.length !== 21)
        throw new Error('Unsupported driver contract');
    const ids = new Set();
    for (const b of r.bones) {
        if (ids.has(b.id) || (b.parent !== null && !ids.has(b.parent)))
            throw new Error('Duplicate bone or non-topological hierarchy');
        for (const n of Object.values(b.bind))
            if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 2000)
                throw new Error('Invalid bind position');
        for (const a of ['x', 'y', 'z']) {
            const l = b.limits[a];
            if (!Array.isArray(l) || l.length !== 2 || !l.every(Number.isFinite) || l[0] > 0 || l[1] < 0 || l[0] >= l[1] || l[0] < -120 || l[1] > 120)
                throw new Error('Invalid driver envelope');
        }
        ids.add(b.id);
    }
    return true;
}
export function constrainPose(rig, raw) {
    const p = neutralDriver(rig), reasons = [];
    for (const a of ['x', 'y', 'z']) {
        const n = raw.root?.[a];
        if (typeof n !== 'number' || !Number.isFinite(n))
            throw new Error('Invalid root');
        p.root[a] = Math.max(-60, Math.min(60, n));
        if (p.root[a] !== n)
            reasons.push('Root translation limit');
    }
    for (const b of rig.bones) {
        const q = raw.rotations?.[b.id];
        if (!q || [q.x, q.y, q.z, q.w].some(n => !Number.isFinite(n)) || Math.abs(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w - 1) > 1e-5)
            throw new Error('Invalid normalized rotation: ' + b.id);
        const e = toXYZ(q);
        for (const a of ['x', 'y', 'z']) {
            const n = e[a];
            e[a] = Math.max(b.limits[a][0], Math.min(b.limits[a][1], n));
            if (Math.abs(e[a] - n) > 1e-6)
                reasons.push(b.label + ' ' + a + ' provisional limit');
        }
        p.rotations[b.id] = fromXYZ(e);
    }
    // Conservative combined spine effort, independent of camera. Not a tissue or self-collision model.
    for (const axis of ['x', 'y', 'z']) {
        const ids = ['pelvis', 'lumbar', 'thorax'], sum = ids.reduce((n, id) => n + Math.abs(toXYZ(p.rotations[id])[axis]), 0);
        if (sum > 22) {
            for (const id of ids) {
                const a = toXYZ(p.rotations[id]);
                a[axis] *= 22 / sum;
                p.rotations[id] = fromXYZ(a);
            }
            reasons.push('Combined spine envelope');
        }
    }
    return { pose: p, reasons: [...new Set(reasons)] };
}
export function evaluateDriver(rig, p) {
    const out = {};
    for (const b of rig.bones) {
        const parent = b.parent ? out[b.parent] : null;
        const rotation = parent ? qMul(parent.rotation, p.rotations[b.id]) : p.rotations[b.id];
        const bindParent = b.parent ? rig.bones.find(q => q.id === b.parent).bind : v3();
        const position = parent ? plus(parent.position, rotate3(parent.rotation, minus(b.bind, bindParent))) : plus(b.bind, p.root);
        const offset = minus(position, rotate3(rotation, b.bind));
        out[b.id] = { position, rotation, skin: makeDQ(rotation, offset) };
    }
    return out;
}
export const withAngle = (p, id, axis, value) => { const out = structuredClone(p), a = toXYZ(out.rotations[id]); a[axis] = value; out.rotations[id] = fromXYZ(a); return out; };
export function interpolatePose(a, b, t) { return { root: plus(a.root, { x: (b.root.x - a.root.x) * t, y: (b.root.y - a.root.y) * t, z: (b.root.z - a.root.z) * t }), rotations: Object.fromEntries(Object.keys(a.rotations).map(id => [id, qSlerp(a.rotations[id], b.rotations[id], t)])) }; }
export function bindSurfaces(world, meshes, welds) {
    const points = new Map();
    let minScale = Infinity, maxScale = 0;
    for (const m of meshes) {
        points.set(m.part.id, m.bind.map((v, i) => transformWeighted(fromBind(v), m.bindings[i].weights.map(w => {
            if (!world[w.bone])
                throw new Error('Missing driver bone ' + w.bone);
            return { weight: w.weight, frame: world[w.bone].skin };
        }))));
        const pts = points.get(m.part.id);
        for (let i = 0; i < m.indices.length; i += 3) {
            if (!m.opaque[i / 3])
                continue;
            const idx = m.indices.slice(i, i + 3), mtr = metric3(idx.map(j => m.bind[j]), idx.map(j => pts[j]));
            minScale = Math.min(minScale, mtr.min);
            maxScale = Math.max(maxScale, mtr.max);
        }
    }
    let seamGap = 0;
    for (const w of welds) {
        const ref = points.get(w.members[0].part)[w.members[0].index];
        for (const n of w.members)
            seamGap = Math.max(seamGap, norm3(minus(ref, points.get(n.part)[n.index])));
    }
    const reasons = [];
    if (minScale < .6)
        reasons.push('Pilot surface compression');
    if (maxScale > 1.5)
        reasons.push('Pilot surface stretching');
    if (seamGap > .03)
        reasons.push('Shared attachment separation');
    return { points, minScale, maxScale, seamGap, accepted: reasons.length === 0, reasons };
}
export const projectShape = (b, c) => new Map([...b.points].map(([id, pts]) => [id, pts.map(p => toBind(project3(p, c)))]));
export function artCoverage(p, c, registrationStatus) {
    if (registrationStatus !== 'provisional')
        return { supported: false, reason: 'The approved guide changed. Re-registration is required before using this artwork.' };
    if (Math.abs(c.yaw) > 12 || Math.abs(c.pitch) > 8)
        return { supported: false, reason: 'This angle needs registered artwork. Driver pose is retained; no front-image substitution.' };
    for (const [id, q] of Object.entries(p.rotations)) {
        const a = toXYZ(q);
        if (Math.abs(a.x) > 10.001 || Math.abs(a.y) > 10.001)
            return { supported: false, reason: 'Depth movement exceeds the provisional front-art envelope (' + id + '). Driver remains available.' };
    }
    return { supported: true, reason: 'Provisional front binding only · ±12° yaw / ±8° pitch. Not an approved design.' };
}
