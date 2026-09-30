/** Screen-oriented direct manipulation. Does not change anatomical IDs or image handedness.
 * All pointer distances are CSS pixels; all geometry is in driver bind units.
 * The current screen projection, its inverse and the drawn handles share this module.
 */
import { evaluateDriver, constrainPose, withAngle, toBind } from './driver.js';
import { v3, plus, minus, norm3, project3, toXYZ, qAxis, qMul, conjugate, identityQ, qNormalize } from './math3.js';
export const AXES = ['x', 'y', 'z'];
export const RING_RADIUS = 34;
/** Exact inverse of project3 = Rx(pitch) * Ry(-yaw). Order matters. */
export function cameraToWorld(p, camera) {
    const pitch = camera.pitch * Math.PI / 180, yaw = camera.yaw * Math.PI / 180;
    const y = Math.cos(pitch) * p.y + Math.sin(pitch) * p.z;
    const z = -Math.sin(pitch) * p.y + Math.cos(pitch) * p.z;
    return v3(Math.cos(yaw) * p.x + Math.sin(yaw) * z, y, -Math.sin(yaw) * p.x + Math.cos(yaw) * z);
}
export function screenDeltaToWorld(dx, dy, camera, scale) {
    if (![dx, dy, scale].every(Number.isFinite) || scale <= 0)
        throw Error('Invalid screen displacement');
    return cameraToWorld(v3(dx / scale, -dy / scale, 0), camera);
}
export function projectScreen(p, camera, fit) {
    const q = toBind(project3(p, camera));
    return { x: fit.x + q.x * fit.scale, y: fit.y + q.y * fit.scale };
}
export function anatomicalSide(id) {
    return id.endsWith('-R') ? 'right' : id.endsWith('-L') ? 'left' : 'midline';
}
const NAMES = { pelvis: 'Pelvis', lumbar: 'Lower spine', thorax: 'Upper spine',
    cervical: 'Neck', head: 'Head', clavicle: 'Clavicle', upper: 'Shoulder', forearm: 'Elbow',
    hand: 'Wrist', thigh: 'Hip', shin: 'Knee', foot: 'Ankle', toe: 'Forefoot' };
export function nodeLabel(id) {
    const side = anatomicalSide(id), name = NAMES[id.replace(/-[RL]$/, '')] ?? id;
    return side === 'midline' ? name : `Her ${side} · ${name}`;
}
export function screenSide(id, world, camera) {
    const x = project3(world[id].position, camera).x - project3(world.pelvis.position, camera).x;
    return Math.abs(x) < 2 ? 'near screen centre' : x < 0 ? 'screen-left' : 'screen-right';
}
/** A joint sits at a bone's origin: rotating that bone cannot move the joint itself.
 * Place the clicked node by rotating appropriate ANCESTORS. Rotate its own bone with the ring.
 */
export function positioningChain(id) {
    const s = id.slice(-1), base = id.replace(/-[RL]$/, '');
    switch (base) {
        case 'pelvis': return [];
        case 'lumbar': return ['pelvis'];
        case 'thorax': return ['lumbar', 'pelvis'];
        case 'cervical': return ['thorax', 'lumbar'];
        case 'head': return ['cervical', 'thorax'];
        case 'clavicle':
        case 'upper': return ['thorax', 'lumbar'];
        case 'forearm': return [`upper-${s}`, `clavicle-${s}`];
        case 'hand': return [`forearm-${s}`, `upper-${s}`, `clavicle-${s}`];
        case 'thigh': return ['pelvis'];
        case 'shin': return [`thigh-${s}`];
        case 'foot': return [`shin-${s}`, `thigh-${s}`];
        case 'toe': return [`foot-${s}`, `shin-${s}`];
        default: throw Error('Unknown node: ' + id);
    }
}
export function beginNodeGrab(rig, pose, bone, camera, scale) {
    const world = evaluateDriver(rig, pose);
    if (!world[bone] || !Number.isFinite(scale) || scale <= 0)
        throw Error('Invalid node grab');
    return { bone, pose: structuredClone(pose), camera: { ...camera }, scale, start: { ...world[bone].position } };
}
function solveLinear3(matrix, rhs) {
    const a = matrix.map((row, i) => [...row, rhs[i]]);
    for (let i = 0; i < 3; i++) {
        let pivot = i;
        for (let j = i + 1; j < 3; j++)
            if (Math.abs(a[j][i]) > Math.abs(a[pivot][i]))
                pivot = j;
        [a[i], a[pivot]] = [a[pivot], a[i]];
        const d = a[i][i];
        if (Math.abs(d) < 1e-12)
            return [0, 0, 0];
        for (let k = i; k < 4; k++)
            a[i][k] /= d;
        for (let j = 0; j < 3; j++)
            if (j !== i) {
                const f = a[j][i];
                for (let k = i; k < 4; k++)
                    a[j][k] -= f * a[i][k];
            }
    }
    return a.map(row => row[3]);
}
/** Camera-plane target solver, NOT a full-body/contact solver. Limb lengths are never edited.
 * Depth is softly regularized to the initial view-plane. Every candidate respects rig limits.
 * The caller must still run the same weighted-surface gate as sliders/imports.
 */
export function solveNodeGrab(rig, grab, dx, dy) {
    const target = plus(grab.start, screenDeltaToWorld(dx, dy, grab.camera, grab.scale));
    if (Math.hypot(dx, dy) < 1e-8)
        return { pose: structuredClone(grab.pose), target, errorPixels: 0, limited: false, moved: false };
    let pose = structuredClone(grab.pose);
    if (grab.bone === 'pelvis') {
        pose.root = plus(pose.root, minus(target, grab.start));
        pose = constrainPose(rig, pose).pose;
        const p = evaluateDriver(rig, pose)[grab.bone].position;
        const e = project3(minus(p, target), grab.camera);
        return { pose, target, errorPixels: Math.hypot(e.x, e.y) * grab.scale, limited: Math.hypot(e.x, e.y) * grab.scale > .8, moved: norm3(minus(p, grab.start)) > 1e-6 };
    }
    const variables = positioningChain(grab.bone).flatMap(bone => AXES.map(axis => ({ bone, axis })));
    // Two screen dimensions, plus a weak depth preference to avoid arbitrary limb rolls.
    const view = (p) => { const q = project3(p, grab.camera); return [q.x, q.y, q.z * .10]; };
    const tv = view(target);
    const point = (p) => evaluateDriver(rig, p)[grab.bone].position;
    const score = (p) => { const v = view(point(p)); return v.reduce((sum, n, i) => sum + (n - tv[i]) ** 2, 0); };
    for (let iter = 0; iter < 35; iter++) {
        const current = view(point(pose)), err = tv.map((n, i) => n - current[i]), prevScore = score(pose);
        if (Math.hypot(err[0], err[1]) * grab.scale < .05)
            break;
        const cols = variables.map(({ bone, axis }) => {
            const e = toXYZ(pose.rotations[bone]);
            const probe = view(point(withAngle(pose, bone, axis, e[axis] + .04)));
            return probe.map((n, i) => (n - current[i]) / .04);
        });
        const a = Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) => cols.reduce((s, c) => s + c[i] * c[j], 0) + (i === j ? .12 : 0)));
        const v = solveLinear3(a, err), delta = cols.map(c => c.reduce((s, n, i) => s + n * v[i], 0));
        const cap = Math.min(1, 4 / Math.max(.001, ...delta.map(Math.abs)));
        let improved = false;
        for (const step of [1, .5, .25, .125, .0625]) {
            let next = structuredClone(pose);
            variables.forEach(({ bone, axis }, i) => { const e = toXYZ(next.rotations[bone]); next = withAngle(next, bone, axis, e[axis] + delta[i] * cap * step); });
            next = constrainPose(rig, next).pose;
            if (score(next) < prevScore - 1e-8) {
                pose = next;
                improved = true;
                break;
            }
        }
        if (!improved)
            break;
    }
    const actual = point(pose), e = project3(minus(actual, target), grab.camera), move = project3(minus(actual, grab.start), grab.camera);
    // A least-squares compromise may leave one axis behind. Never publish its reversed component.
    const sx = move.x * grab.scale, sy = -move.y * grab.scale;
    if ((Math.abs(dx) > .25 && sx * Math.sign(dx) < -.05) || (Math.abs(dy) > .25 && sy * Math.sign(dy) < -.05)) {
        return { pose: structuredClone(grab.pose), target, errorPixels: Math.hypot(dx, dy), limited: true, moved: false };
    }
    const errorPixels = Math.hypot(e.x, e.y) * grab.scale;
    return { pose, target, errorPixels, limited: errorPixels > .8, moved: Math.hypot(sx, sy) > .001 };
}
export function shortestDegrees(degrees) { return ((degrees + 180) % 360 + 360) % 360 - 180; }
/** Camera-normal world rotation converted into the selected bone's current parent space.
 * Positive screen angle is clockwise because screen Y is down; world rotation gets the minus sign.
 */
export function rotateInView(rig, pose, bone, camera, clockwise) {
    const world = evaluateDriver(rig, pose), def = rig.bones.find(b => b.id === bone);
    if (!def || !Number.isFinite(clockwise))
        throw Error('Invalid rotation control');
    const parent = def.parent ? world[def.parent].rotation : identityQ();
    const axis = cameraToWorld(v3(0, 0, 1), camera), delta = qAxis(axis, -clockwise);
    const out = structuredClone(pose);
    out.rotations[bone] = qNormalize(qMul(conjugate(parent), qMul(delta, world[bone].rotation)));
    return out;
}
/** Stable target picking: a selected coincident joint wins; otherwise prefer the moving shoulder
 * over its same-position clavicle, then the frontmost node. Neither side is swapped. */
export function pickNode(rig, pose, camera, fit, at, selected, radius = 19) {
    const world = evaluateDriver(rig, pose);
    const hits = rig.bones.map(b => {
        const p = projectScreen(world[b.id].position, camera, fit);
        return {
            id: b.id, d: Math.hypot(at.x - p.x, at.y - p.y), z: project3(world[b.id].position, camera).z
        };
    }).filter(p => p.d <= radius);
    hits.sort((a, b) => Math.abs(a.d - b.d) > .7 ? a.d - b.d :
        a.id === selected ? -1 : b.id === selected ? 1 :
            a.id.startsWith('upper-') && !b.id.startsWith('upper-') ? -1 :
                b.id.startsWith('upper-') && !a.id.startsWith('upper-') ? 1 : b.z - a.z);
    return hits[0]?.id ?? null;
}
