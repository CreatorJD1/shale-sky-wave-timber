export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const plus = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const minus = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const times = (a, n) => v3(a.x * n, a.y * n, a.z * n);
export const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const norm3 = (a) => Math.sqrt(dot3(a, a));
export const distance3 = (a, b) => norm3(minus(a, b));
export const unit3 = (a) => times(a, 1 / (norm3(a) || 1));
export const identityQ = () => ({ x: 0, y: 0, z: 0, w: 1 });
export const conjugate = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
export const qScale = (q, n) => ({ x: q.x * n, y: q.y * n, z: q.z * n, w: q.w * n });
export const qPlus = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w });
export const qDot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
export const qNormalize = (q) => qScale(q, 1 / (Math.sqrt(qDot(q, q)) || 1));
export function qMul(a, b) { return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z }; }
export function qAxis(axis, deg) { const a = unit3(axis), t = deg * Math.PI / 360, s = Math.sin(t); return { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(t) }; }
/** XYZ intrinsic convention: q = qx*qy*qz. Persisted rotations are quaternions. */
export const fromXYZ = (a) => qNormalize(qMul(qMul(qAxis(v3(1, 0, 0), a.x), qAxis(v3(0, 1, 0), a.y)), qAxis(v3(0, 0, 1), a.z)));
export function toXYZ(q0) {
    const q = qNormalize(q0), x = q.x, y = q.y, z = q.z, w = q.w;
    const m11 = 1 - 2 * (y * y + z * z), m12 = 2 * (x * y - z * w), m13 = 2 * (x * z + y * w), m22 = 1 - 2 * (x * x + z * z), m23 = 2 * (y * z - x * w), m32 = 2 * (y * z + x * w), m33 = 1 - 2 * (x * x + y * y);
    const ay = Math.asin(Math.max(-1, Math.min(1, m13)));
    let ax, az;
    if (Math.abs(m13) < .9999999) {
        ax = Math.atan2(-m23, m33);
        az = Math.atan2(-m12, m11);
    }
    else {
        ax = Math.atan2(m32, m22);
        az = 0;
    }
    return times(v3(ax, ay, az), 180 / Math.PI);
}
export const rotate3 = (q, p) => { const v = qMul(qMul(q, { ...p, w: 0 }), conjugate(q)); return v3(v.x, v.y, v.z); };
export function qSlerp(a, b0, t) {
    let b = b0, d = qDot(a, b);
    if (d < 0) {
        b = qScale(b, -1);
        d = -d;
    }
    if (d > .9995)
        return qNormalize(qPlus(qScale(a, 1 - t), qScale(b, t)));
    const angle = Math.acos(Math.min(1, d)), s = Math.sin(angle);
    return qPlus(qScale(a, Math.sin((1 - t) * angle) / s), qScale(b, Math.sin(t * angle) / s));
}
export const makeDQ = (q, t) => ({ real: q, dual: qScale(qMul({ ...t, w: 0 }, q), .5) });
/** Hemisphere-aligned normalized dual-quaternion blending. One application only. */
export function transformWeighted(point, list) {
    if (!list.length)
        throw new Error('Unbound point');
    let r = { x: 0, y: 0, z: 0, w: 0 }, d = { ...r };
    const ref = list[0].frame.real;
    for (const a of list) {
        const w = a.weight * (qDot(ref, a.frame.real) < 0 ? -1 : 1);
        r = qPlus(r, qScale(a.frame.real, w));
        d = qPlus(d, qScale(a.frame.dual, w));
    }
    const n = Math.sqrt(qDot(r, r));
    if (n < 1e-9)
        throw new Error('Degenerate blend');
    r = qScale(r, 1 / n);
    d = qScale(d, 1 / n);
    d = qPlus(d, qScale(r, -qDot(r, d)));
    const t = qScale(qMul(d, conjugate(r)), 2);
    return plus(rotate3(r, point), v3(t.x, t.y, t.z));
}
/** Orthographic, object-centred camera. Orbit does not mutate any driver transforms. */
export function project3(p, c) { const yaw = -c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180; const x = Math.cos(yaw) * p.x + Math.sin(yaw) * p.z, z = -Math.sin(yaw) * p.x + Math.cos(yaw) * p.z; return v3(x, Math.cos(pitch) * p.y - Math.sin(pitch) * z, Math.sin(pitch) * p.y + Math.cos(pitch) * z); }
/** Singular values of a 3D triangle mapping, relative to its 2D bind triangle. */
export function metric3(bind, posed) {
    const u = bind[1].x - bind[0].x, v = bind[1].y - bind[0].y, s = bind[2].x - bind[0].x, t = bind[2].y - bind[0].y, det = u * t - s * v;
    if (Math.abs(det) < 1e-10)
        return { min: 0, max: Infinity, area: 0 };
    const a = minus(posed[1], posed[0]), b = minus(posed[2], posed[0]), j1 = times(minus(times(a, t), times(b, v)), 1 / det), j2 = times(minus(times(b, u), times(a, s)), 1 / det);
    const aa = dot3(j1, j1), bb = dot3(j2, j2), ab = dot3(j1, j2), r = Math.sqrt((aa - bb) ** 2 + 4 * ab * ab);
    return { min: Math.sqrt(Math.max(0, (aa + bb - r) / 2)), max: Math.sqrt(Math.max(0, (aa + bb + r) / 2)), area: norm3(cross3(j1, j2)) };
}
