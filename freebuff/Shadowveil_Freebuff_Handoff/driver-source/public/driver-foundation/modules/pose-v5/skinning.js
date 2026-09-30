/** Real normalized bind weights and 2D dual-quaternion skinning.
 * Skinning matrices come from the same FK chain as the controls. Short-lived
 * maps are pose-space joint correctives, not a hidden undeformed sprite.
 */
import { REST, clamp, add, sub, mul, rot, dist, bodyPoint, bodyAngle, neckPoint, headPoint, armChain, legChain, clavicleBase, clavicleAngle, sideSign, ballRest } from './core.js';
export const SKIN_DEFAULT = { correctives: true };
export const BONE_PALETTE = { pelvis: '#7a88ed', lumbar: '#c182e5', thorax: '#efb166', cervical: '#dc7d98', head: '#cf627b', 'clavicle-R': '#64ce97', 'clavicle-L': '#88bcda', 'upper-R': '#3cbcad', 'upper-L': '#59bad9', 'forearm-R': '#f1c056', 'forearm-L': '#bb95e5', 'hand-R': '#e98470', 'hand-L': '#cb8daf', 'thigh-R': '#55aee0', 'thigh-L': '#7aa6ee', 'shin-R': '#dbb970', 'shin-L': '#80c4a6', 'foot-R': '#de8c70', 'foot-L': '#d69abf', 'toe-R': '#df8484', 'toe-L': '#b589cc' };
const skinSmooth = (t) => { const a = clamp(t, 0, 1); return a * a * (3 - 2 * a); };
export function normalizeWeights(list) { const m = new Map(); for (const q of list)
    if (Number.isFinite(q.weight) && q.weight > 0)
        m.set(q.bone, (m.get(q.bone) || 0) + q.weight); const sum = [...m.values()].reduce((a, b) => a + b, 0); if (sum < 1e-12)
    return [{ bone: 'pelvis', weight: 1 }]; return [...m].map(([bone, w]) => ({ bone, weight: w / sum })); }
const only = (bone) => [{ bone, weight: 1 }];
const blendW = (a, b, t) => normalizeWeights([...a.map(q => ({ ...q, weight: q.weight * (1 - t) })), ...b.map(q => ({ ...q, weight: q.weight * t }))]);
export function skinFrames(p) {
    const f = {};
    const body = (n, y) => { const b = { x: REST.root.x, y }; f[n] = { bind: b, world: bodyPoint(p, b), angle: bodyAngle(p, y) }; };
    body('pelvis', REST.root.y);
    body('lumbar', 443);
    body('thorax', 342);
    const nb = { x: REST.root.x, y: 242 };
    f.cervical = { bind: nb, world: neckPoint(p, nb), angle: bodyAngle(p, 250) + p.neck * (250 - 242) / 38 };
    const hb = { x: REST.root.x, y: 212 };
    f.head = { bind: hb, world: headPoint(p, hb), angle: bodyAngle(p, 250) + p.neck + p.head };
    for (const s of ['R', 'L']) {
        const a = armChain(p, s), l = legChain(p, s), r = REST[s];
        f['clavicle-' + s] = { bind: r.shoulder, world: a.a, angle: bodyAngle(p, clavicleBase(s).y) + sideSign(s) * clavicleAngle(p, s) };
        f['upper-' + s] = { bind: r.shoulder, world: a.a, angle: a.upper };
        f['forearm-' + s] = { bind: r.elbow, world: a.b, angle: a.lower };
        f['hand-' + s] = { bind: r.wrist, world: a.c, angle: a.end };
        f['thigh-' + s] = { bind: r.hip, world: l.a, angle: l.upper };
        f['shin-' + s] = { bind: r.knee, world: l.b, angle: l.lower };
        f['foot-' + s] = { bind: r.ankle, world: l.c, angle: l.end };
        const ball = ballRest(s);
        f['toe-' + s] = { bind: ball, world: add(l.c, rot(sub(ball, r.ankle), l.end)), angle: l.end + sideSign(s) * p.legs[s].toe };
    }
    return f;
}
function spineWeights(v) {
    const y = v.y;
    if (y >= 490)
        return only('pelvis');
    if (y >= 401)
        return blendW(only('pelvis'), only('lumbar'), skinSmooth((490 - y) / 89));
    if (y >= 310)
        return blendW(only('lumbar'), only('thorax'), skinSmooth((401 - y) / 91));
    if (y >= 242)
        return blendW(only('thorax'), only('cervical'), skinSmooth((283 - y) / 41));
    if (y >= 212)
        return blendW(only('cervical'), only('head'), skinSmooth((242 - y) / 30));
    return only('head');
}
function pelvicWeights(v) { const t = skinSmooth((v.y - 503) / 121), width = 40 * (1 - skinSmooth((v.y - 563) / 60)) + .01, left = skinSmooth((v.x - REST.root.x + width / 2) / width); return blendW(only('pelvis'), blendW(only('thigh-R'), only('thigh-L'), left), t); }
function sleeveWeights(s, v) {
    const r = REST[s], y = v.y;
    if (y < r.shoulder.y + 72)
        return blendW(only('clavicle-' + s), only('upper-' + s), skinSmooth((y - r.shoulder.y + 10) / 82));
    if (y < r.elbow.y + 38)
        return blendW(only('upper-' + s), only('forearm-' + s), skinSmooth((y - r.elbow.y + 38) / 76));
    return blendW(only('forearm-' + s), only('hand-' + s), skinSmooth((y - r.wrist.y + 17) / 34));
}
export function bindingFor(id, v) {
    const s = id.endsWith('R') ? 'R' : 'L', r = REST[s];
    let weights, region = id, corrective = 0, locked = false;
    if (id === 'torso')
        weights = v.y > 503 ? pelvicWeights(v) : spineWeights(v);
    else if (id === 'head')
        weights = spineWeights(v);
    else if (id.startsWith('arm') || id.startsWith('hand'))
        weights = sleeveWeights(s, v);
    else if (id.startsWith('leg')) {
        if (v.y < 624)
            weights = pelvicWeights(v);
        else if (v.y < r.knee.y + 48)
            weights = blendW(only('thigh-' + s), only('shin-' + s), skinSmooth((v.y - r.knee.y + 48) / 96));
        else
            weights = blendW(only('shin-' + s), only('foot-' + s), skinSmooth((v.y - r.ankle.y + 20) / 40));
    }
    else if (id.startsWith('foot')) {
        weights = v.y < r.ankle.y + 20 ? blendW(only('shin-' + s), only('foot-' + s), skinSmooth((v.y - r.ankle.y + 20) / 40)) : blendW(only('foot-' + s), only('toe-' + s), skinSmooth((v.y - ballRest(s).y + 10) / 25));
    }
    else
        weights = only('pelvis');
    // Shoulder skin at the cap is shared by sleeve and torso. Topology welds at
    // matching opaque points below add an exact shared binding at their seam.
    if (id === 'torso')
        for (const side of ['R', 'L']) {
            const rr = REST[side], d = dist(v, rr.shoulder), outward = (v.x - REST.root.x) * (-sideSign(side)), a = skinSmooth((outward - 37) / 28) * (1 - skinSmooth((d - 16) / 48));
            if (a > 0)
                weights = blendW(weights, only('clavicle-' + side), a);
        }
    // Correctives are stored per vertex, limited to local deforming regions.
    if (id.startsWith('arm'))
        corrective = .95 * (1 - skinSmooth((Math.abs(v.y - r.elbow.y) - 35) / 60));
    if (id.startsWith('leg') && v.y > 624)
        corrective = .65 * (1 - skinSmooth(Math.abs(v.y - r.knee.y) / 103));
    if (id === 'torso' || (id.startsWith('leg') && v.y < 624))
        corrective = 0;
    return { weights: normalizeWeights(weights), corrective, region, locked };
}
export function dqSkin(v, weights, frames) {
    let rw = 0, rz = 0, dx = 0, dy = 0, firstW = 0, firstZ = 0;
    for (let i = 0; i < weights.length; i++) {
        const q = weights[i], f = frames[q.bone];
        if (!f)
            throw new Error('Missing skin bone ' + q.bone);
        const a = f.angle * Math.PI / 360;
        let w = Math.cos(a), z = Math.sin(a), sign = 1;
        if (i === 0) {
            firstW = w;
            firstZ = z;
        }
        else if (w * firstW + z * firstZ < 0)
            sign = -1;
        w *= sign;
        z *= sign;
        const t = sub(f.world, rot(f.bind, f.angle));
        rw += w * q.weight;
        rz += z * q.weight;
        dx += (t.x * w + t.y * z) * .5 * q.weight;
        dy += (t.y * w - t.x * z) * .5 * q.weight;
    }
    const norm = rw * rw + rz * rz;
    if (norm < 1e-12)
        return v;
    const angle = 2 * Math.atan2(rz, rw) * 180 / Math.PI;
    return add(rot(v, angle), { x: 2 * (dx * rw - dy * rz) / norm, y: 2 * (dy * rw + dx * rz) / norm });
}
export function skinVertexBound(v, b, frames, pose, part, corrector, enabled = true) {
    const a = dqSkin(v, b.weights, frames);
    if (!enabled || b.corrective <= 0)
        return a;
    const s = part.endsWith('R') ? 'R' : 'L', angle = part.startsWith('arm') ? pose.arms[s].flex : pose.legs[s].knee;
    const amount = b.corrective * skinSmooth(angle / 90), target = corrector(v);
    return add(a, mul(sub(target, a), amount));
}
/** Only genuine attachment regions are welded; overlapping crossed limbs are not. */
export const SEAM_REGIONS = [{ a: 'torso', b: 'head', y0: 214, y1: 244, kind: 'neck' }, ...['R', 'L'].flatMap(s => [
        { a: 'torso', b: 'arm-' + s, y0: 246, y1: 306, kind: 'shoulder-' + s },
        { a: 'torso', b: 'leg-' + s, y0: 508, y1: 572, kind: 'hip-' + s },
        { a: 'arm-' + s, b: 'hand-' + s, y0: 542, y1: 566, kind: 'wrist-' + s },
        { a: 'leg-' + s, b: 'foot-' + s, y0: 960, y1: 987, kind: 'ankle-' + s }
    ]), { a: 'leg-R', b: 'leg-L', y0: 508, y1: 566, kind: 'pelvis-center' }];
