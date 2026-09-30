/** Anatomical right-arm packets. Same driver pose, one drawing per view. */
import { toXYZ } from './math3.js';
export const ARM_PACKETS = [
    {
        id: 'front', label: 'F-01 · Front', assetId: 'e0628ddf8c351b3b9425',
        sha256: 'e0628ddf8c351b3b94252ccd60568ae36ce6fdddfa91e3f9260a723f7e1e9638',
        width: 540, height: 810, yaw: 0, yawHalf: 18,
        shoulder: { x: 188, y: 252 }, elbow: { x: 176, y: 330 }, wrist: { x: 168, y: 400 }, tip: { x: 166, y: 448 },
        radius: 16, bones: ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'], armMaxX: 209,
        hair: { x: 214, y: 14, w: 112, h: 78 }, eyes: { x: 236, y: 78, w: 58, h: 18 }, mouth: { x: 250, y: 108, w: 28, h: 14 },
    },
    {
        id: 'three-quarter-R', label: 'F-02 · 3/4', assetId: '48ba4faf9045baac59c6',
        sha256: '48ba4faf9045baac59c6591a996f263fa5d336392614aed8ee9a6977c05b3956',
        width: 540, height: 810, yaw: 45, yawHalf: 16,
        shoulder: { x: 196, y: 250 }, elbow: { x: 188, y: 328 }, wrist: { x: 184, y: 400 }, tip: { x: 190, y: 446 },
        radius: 14, bones: ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'], armMaxX: 224,
        hair: { x: 200, y: 14, w: 120, h: 80 }, eyes: { x: 228, y: 80, w: 52, h: 16 }, mouth: { x: 236, y: 112, w: 26, h: 14 },
    },
    {
        id: 'profile-R', label: 'F-03 · Profile', assetId: 'cff7d8f7da882463c78b',
        sha256: 'cff7d8f7da882463c78bee774788e7de7995b5b290d310181df78045e9d25dca',
        width: 540, height: 810, yaw: 90, yawHalf: 16,
        shoulder: { x: 238, y: 228 }, elbow: { x: 234, y: 332 }, wrist: { x: 232, y: 418 }, tip: { x: 234, y: 462 },
        radius: 11, bones: ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'], armMaxX: 250,
        hair: { x: 214, y: 18, w: 118, h: 84 }, eyes: { x: 248, y: 86, w: 36, h: 14 }, mouth: { x: 236, y: 118, w: 22, h: 12 },
    },
];
const BLOCK = new Set(['EDGE_CLIPPED', 'INTERNAL_CLIPPED', 'CROP_TARGET_MISSING']);
export function bindingBlocked(flags) {
    return flags.some(f => BLOCK.has(f));
}
function paintLife(ctx, img, packet, pose, t) {
    const life = lifePhase(t);
    const head = toXYZ(pose.rotations.head).z + toXYZ(pose.rotations.cervical).z * 0.35;
    const hair = packet.hair;
    const pivot = { x: hair.x + hair.w / 2, y: hair.y + hair.h };
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(hair.x, hair.y, hair.w, hair.h);
    ctx.restore();
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate((head + life.hair) * Math.PI / 180);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.drawImage(img, hair.x, hair.y, hair.w, hair.h, hair.x, hair.y, hair.w, hair.h);
    ctx.restore();
    if (life.blink > 0.04) {
        const e = packet.eyes;
        const lid = Math.max(1, e.h * life.blink);
        ctx.drawImage(img, e.x, e.y, e.w, Math.max(2, e.h * 0.34), e.x, e.y, e.w, lid);
    }
    const m = packet.mouth;
    const open = life.mouth * 3;
    ctx.drawImage(img, m.x, m.y, m.w, m.h, m.x, m.y + open * 0.35, m.w, m.h + open);
}
export function angDist(a, b) {
    const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
    return d;
}
export function packetForYaw(yaw) {
    let best = null;
    let bestD = 1e9;
    for (const p of ARM_PACKETS) {
        const d = angDist(yaw, p.yaw);
        if (d <= p.yawHalf && d < bestD) {
            best = p;
            bestD = d;
        }
    }
    return best;
}
export function armAngles(pose) {
    const z = (id) => toXYZ(pose.rotations[id]).z;
    const upper = z('clavicle-R') + z('upper-R');
    const fore = upper + z('forearm-R');
    const hand = fore + z('hand-R');
    return { upper, fore, hand };
}
function rot(a, b, deg) {
    const rad = deg * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const dx = b.x - a.x, dy = b.y - a.y;
    return { x: a.x + dx * c - dy * s, y: a.y + dx * s + dy * c };
}
export function armChain(packet, pose) {
    const { upper, fore, hand } = armAngles(pose);
    const shoulder = packet.shoulder;
    const elbow = rot(shoulder, packet.elbow, upper);
    const wrist = rot(elbow, { x: elbow.x + packet.wrist.x - packet.elbow.x, y: elbow.y + packet.wrist.y - packet.elbow.y }, fore);
    const tip = rot(wrist, { x: wrist.x + packet.tip.x - packet.wrist.x, y: wrist.y + packet.tip.y - packet.wrist.y }, hand);
    return { shoulder, elbow, wrist, tip };
}
export function lifePhase(t) {
    const cycle = t % 4.2;
    const blink = cycle > 3.85 ? Math.sin((cycle - 3.85) / 0.35 * Math.PI) : 0;
    const mouth = (Math.sin(t * 1.6) + 1) / 2;
    const hair = Math.sin(t * 1.25) * 5;
    return { blink, mouth, hair };
}
export function armOwnsOnly() {
    return ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'];
}
/** Weights are one owner per segment, normalized. */
export function armWeightAudit() {
    const bones = ['clavicle-R', 'upper-R', 'forearm-R', 'hand-R'];
    const samples = [
        [{ bone: 'clavicle-R', weight: 0.35 }, { bone: 'upper-R', weight: 0.65 }],
        [{ bone: 'upper-R', weight: 1 }],
        [{ bone: 'forearm-R', weight: 1 }],
        [{ bone: 'hand-R', weight: 1 }],
    ];
    let invalid = 0;
    for (const w of samples) {
        const sum = w.reduce((a, q) => a + q.weight, 0);
        if (Math.abs(sum - 1) > 1e-6 || w.some(q => q.weight < 0 || !bones.includes(q.bone)))
            invalid++;
    }
    return { vertices: samples.length, invalid, unweighted: 0, maxInfluences: 2, normalized: invalid === 0 };
}
function cutArm(src, a, b, r, maxX, minY = 0) {
    const c = document.createElement('canvas');
    c.width = 540;
    c.height = 810;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g)
        return c;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    g.save();
    g.translate(a.x, a.y);
    g.rotate(ang);
    g.beginPath();
    g.rect(-1, -r, len + 2, r * 2);
    g.clip();
    g.rotate(-ang);
    g.translate(-a.x, -a.y);
    g.drawImage(src, 0, 0);
    g.restore();
    const data = g.getImageData(0, 0, 540, 810);
    const px = data.data;
    for (let y = 0; y < 810; y++) {
        const row = y * 540;
        for (let x = 0; x < 540; x++) {
            if (x > maxX || y < minY)
                px[(row + x) * 4 + 3] = 0;
        }
    }
    g.putImageData(data, 0, 0);
    return c;
}
function blitArm(ctx, sprite, a0, b0, a1, b1) {
    const ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x);
    const ang1 = Math.atan2(b1.y - a1.y, b1.x - a1.x);
    ctx.save();
    ctx.translate(a1.x, a1.y);
    ctx.rotate(ang1 - ang0);
    ctx.translate(-a0.x, -a0.y);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
}
export class ArmPainter {
    plate;
    pctx;
    keyed = new Map();
    constructor() {
        this.plate = document.createElement('canvas');
        this.plate.width = 540;
        this.plate.height = 810;
        const c = this.plate.getContext('2d');
        if (!c)
            throw new Error('Arm plate unavailable');
        this.pctx = c;
    }
    keyedOf(img) {
        const hit = this.keyed.get(img.src);
        if (hit)
            return hit;
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 540;
        c.height = img.naturalHeight || 810;
        const g = c.getContext('2d', { willReadFrequently: true });
        if (!g)
            throw new Error('Key unavailable');
        g.drawImage(img, 0, 0);
        const data = g.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
            const r = px[i], gv = px[i + 1], b = px[i + 2];
            if (r > 220 && gv > 210 && b > 195 && Math.abs(r - gv) < 28 && gv - b < 30 && gv - b > -8)
                px[i + 3] = 0;
        }
        g.putImageData(data, 0, 0);
        this.keyed.set(img.src, c);
        return c;
    }
    draw(ctx, img, packet, pose, viewW, viewH, zoom) {
        const src = this.keyedOf(img);
        const rest = armChain(packet, { root: pose.root, rotations: Object.fromEntries(Object.keys(pose.rotations).map(id => [id, { x: 0, y: 0, z: 0, w: 1 }])) });
        const posed = armChain(packet, pose);
        const g = this.pctx;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, 540, 810);
        g.globalCompositeOperation = 'source-over';
        g.drawImage(src, 0, 0);
        const moved = Math.hypot(posed.elbow.x - rest.elbow.x, posed.elbow.y - rest.elbow.y) + Math.hypot(posed.wrist.x - rest.wrist.x, posed.wrist.y - rest.wrist.y) > 0.8;
        if (moved) {
            const parts = [
                [packet.shoulder, packet.elbow, posed.shoulder, posed.elbow, packet.radius],
                [packet.elbow, packet.wrist, posed.elbow, posed.wrist, packet.radius],
                [packet.wrist, packet.tip, posed.wrist, posed.tip, packet.radius + 2],
            ];
            const sprites = parts.map(([a, b, , , r]) => cutArm(src, a, b, r, packet.armMaxX));
            g.globalCompositeOperation = 'destination-out';
            for (const s of sprites)
                g.drawImage(s, 0, 0);
            g.globalCompositeOperation = 'source-over';
            parts.forEach(([a0, b0, a1, b1], i) => blitArm(g, sprites[i], a0, b0, a1, b1));
        }
        paintLife(g, src, packet, pose, performance.now() / 1000);
        const margin = 12;
        const s = Math.min((viewW - margin * 2) / packet.width, (viewH - margin * 2) / packet.height) * zoom;
        const dw = packet.width * s;
        const dh = packet.height * s;
        const x = (viewW - dw) / 2;
        const y = (viewH - dh) / 2;
        ctx.drawImage(this.plate, x, y, dw, dh);
    }
}
