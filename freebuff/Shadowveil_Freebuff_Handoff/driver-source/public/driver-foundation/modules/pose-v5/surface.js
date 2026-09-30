/** Deterministic premultiplied-alpha texture rasterizer.
 * Shared triangle edges replace within a part, then each complete part is composited
 * once. This avoids both alpha-darkened seams and Canvas clip-antialias cracks.
 * Does not require WebGL (including on browsers which disable WebGL contexts).
 */
import { createPartMapper, REST } from './core.js';
import { bindingFor, normalizeWeights, SEAM_REGIONS, BONE_PALETTE } from './skinning.js';
import { triangleMetric, posedMeshes } from './guard.js';
export class SurfaceRenderer {
    canvas = document.createElement('canvas');
    ctx;
    surfaces = new Map();
    diagnostic = 'art';
    selectedBone = 'all';
    wireframe = false;
    weldGroups = [];
    lastPoints = new Map();
    health = { invertedOpaqueTriangles: 0, totalOpaqueTriangles: 0, folds: [] };
    sourceHash;
    constructor(atlas, images) {
        this.sourceHash = atlas.source_sha256 ?? 'unrecorded';
        this.ctx = this.canvas.getContext('2d');
        for (const part of atlas.parts) {
            const temp = document.createElement('canvas');
            temp.width = part.w;
            temp.height = part.h;
            const c = temp.getContext('2d');
            c.drawImage(images[part.id], 0, 0);
            const pixels = c.getImageData(0, 0, part.w, part.h).data;
            const texture = new Float32Array(pixels.length);
            for (let i = 0; i < pixels.length; i += 4) {
                const a = pixels[i + 3] / 255;
                texture[i] = pixels[i] * a;
                texture[i + 1] = pixels[i + 1] * a;
                texture[i + 2] = pixels[i + 2] * a;
                texture[i + 3] = pixels[i + 3];
            }
            const xOrigin = Math.floor(part.x / 5) * 5, yOrigin = Math.floor(part.y / 5) * 5, cols = Math.ceil((part.x + part.w - xOrigin) / 5), rows = Math.ceil((part.y + part.h - yOrigin) / 5), bind = [];
            for (let y = 0; y <= rows; y++)
                for (let x = 0; x <= cols; x++)
                    bind.push({ x: xOrigin + 5 * x, y: yOrigin + 5 * y });
            const idx = [], opaque = [];
            const alpha = (x, y) => pixels[(Math.min(part.h - 1, Math.max(0, Math.round(y))) * part.w + Math.min(part.w - 1, Math.max(0, Math.round(x)))) * 4 + 3];
            for (let y = 0; y < rows; y++)
                for (let x = 0; x < cols; x++) {
                    const a = y * (cols + 1) + x, b = a + 1, c = a + cols + 1, d = c + 1;
                    // Cull transparent cells with a full integral-style local scan at bind time.
                    let visible = false;
                    const minx = Math.max(0, xOrigin + 5 * x - part.x), maxx = Math.min(part.w - 1, xOrigin + 5 * (x + 1) - part.x);
                    const miny = Math.max(0, yOrigin + 5 * y - part.y), maxy = Math.min(part.h - 1, yOrigin + 5 * (y + 1) - part.y);
                    for (let yy = miny; yy <= maxy && !visible; yy++)
                        for (let xx = minx; xx <= maxx; xx++)
                            if (alpha(xx, yy) > 0) {
                                visible = true;
                                break;
                            }
                    if (!visible)
                        continue;
                    for (const tri of [[a, b, c], [b, d, c]]) {
                        const v = tri.map(i => bind[i]), mx = v.reduce((a, b) => a + b.x - part.x, 0) / 3, my = v.reduce((a, b) => a + b.y - part.y, 0) / 3;
                        idx.push(...tri);
                        opaque.push(alpha(mx, my) > 230);
                    }
                }
            this.surfaces.set(part.id, { part, texture, alpha: pixels, bind, bindings: bind.map(v => bindingFor(part.id, v)), indices: idx, opaque });
        }
        this.weldBindings();
    }
    draw(p, k, w, h, dpr, order, mappedPoints) {
        const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
        if (this.canvas.width !== pw)
            this.canvas.width = pw;
        if (this.canvas.height !== ph)
            this.canvas.height = ph;
        const final = new Float32Array(pw * ph * 4);
        this.health = { invertedOpaqueTriangles: 0, totalOpaqueTriangles: 0, folds: [] };
        this.lastPoints = mappedPoints ?? posedMeshes(p, [...this.surfaces.values()]);
        for (const drawID of order) {
            const [id, section] = drawID.split(':');
            const m = this.surfaces.get(id);
            if (!m)
                continue;
            const mapper = createPartMapper(p, id);
            const posed = this.lastPoints.get(id);
            const points = posed.map(a => ({ x: (a.x * k.scale + k.x) * dpr, y: (a.y * k.scale + k.y) * dpr }));
            let bx0 = pw, by0 = ph, bx1 = 0, by1 = 0;
            for (const v of points) {
                bx0 = Math.min(bx0, v.x);
                by0 = Math.min(by0, v.y);
                bx1 = Math.max(bx1, v.x);
                by1 = Math.max(by1, v.y);
            }
            bx0 = Math.max(0, Math.floor(bx0));
            by0 = Math.max(0, Math.floor(by0));
            bx1 = Math.min(pw, Math.ceil(bx1));
            by1 = Math.min(ph, Math.ceil(by1));
            const bw = bx1 - bx0, bh = by1 - by0;
            if (bw < 1 || bh < 1)
                continue;
            const layer = new Float32Array(bw * bh * 4), tw = m.part.w, th = m.part.h, tex = m.texture;
            for (let i = 0; i < m.indices.length; i += 3) {
                const ai = m.indices[i], bi = m.indices[i + 1], ci = m.indices[i + 2];
                if (section) {
                    const split = REST[id.endsWith('R') ? 'R' : 'L'].shoulder.y + 60, centroid = (m.bind[ai].y + m.bind[bi].y + m.bind[ci].y) / 3;
                    if (section === 'back' ? centroid > split : centroid <= split)
                        continue;
                }
                const a = points[ai], b = points[bi], c = points[ci];
                const x1 = b.x - a.x, y1 = b.y - a.y, x2 = c.x - a.x, y2 = c.y - a.y, det = x1 * y2 - x2 * y1;
                if (m.opaque[i / 3]) {
                    this.health.totalOpaqueTriangles++;
                    if (det < -.001) {
                        this.health.invertedOpaqueTriangles++;
                        this.health.folds.push({ part: id, x: m.bind[ai].x, y: m.bind[ai].y });
                    }
                }
                if (Math.abs(det) < 1e-7)
                    continue;
                const q = m.bind[ai], r = m.bind[bi], s = m.bind[ci];
                let heatA = [0, 0, 0], heatB = [0, 0, 0], heatC = [0, 0, 0];
                if (this.diagnostic !== 'art') {
                    if (this.diagnostic === 'strain') {
                        const metric = triangleMetric(q, r, s, posed[ai], posed[bi], posed[ci]);
                        heatA = heatB = heatC = this.strainColor(metric.compression, metric.stretch, metric.area);
                    }
                    else {
                        heatA = this.bindingColor(m.bindings[ai]);
                        heatB = this.bindingColor(m.bindings[bi]);
                        heatC = this.bindingColor(m.bindings[ci]);
                    }
                }
                const ua = q.x - m.part.x, va = q.y - m.part.y;
                const dudx = ((r.x - q.x) * y2 - (s.x - q.x) * y1) / det, dudy = ((s.x - q.x) * x1 - (r.x - q.x) * x2) / det;
                const dvdx = ((r.y - q.y) * y2 - (s.y - q.y) * y1) / det, dvdy = ((s.y - q.y) * x1 - (r.y - q.y) * x2) / det;
                const x0 = Math.max(bx0, Math.ceil(Math.min(a.x, b.x, c.x) - .5)), y0 = Math.max(by0, Math.ceil(Math.min(a.y, b.y, c.y) - .5));
                const xmax = Math.min(bx1 - 1, Math.floor(Math.max(a.x, b.x, c.x) - .5)), ymax = Math.min(by1 - 1, Math.floor(Math.max(a.y, b.y, c.y) - .5));
                for (let y = y0; y <= ymax; y++)
                    for (let x = x0; x <= xmax; x++) {
                        const dx = x + .5 - a.x, dy = y + .5 - a.y;
                        const u = (dx * y2 - dy * x2) / det, v = (dy * x1 - dx * y1) / det;
                        if (u < -.00001 || v < -.00001 || u + v > 1.00001)
                            continue;
                        const tx = ua + dudx * dx + dudy * dy - .5, ty = va + dvdx * dx + dvdy * dy - .5;
                        if (tx < -.5 || ty < -.5 || tx >= tw - .5 || ty >= th - .5)
                            continue;
                        const sx = Math.floor(tx), sy = Math.floor(ty), fx = tx - sx, fy = ty - sy;
                        const xlo = Math.max(0, sx), ylo = Math.max(0, sy), xhi = Math.min(tw - 1, sx + 1), yhi = Math.min(th - 1, sy + 1);
                        const p0 = (ylo * tw + xlo) * 4, p1 = (ylo * tw + xhi) * 4, p2 = (yhi * tw + xlo) * 4, p3 = (yhi * tw + xhi) * 4;
                        const f0 = (1 - fx) * (1 - fy), f1 = fx * (1 - fy), f2 = (1 - fx) * fy, f3 = fx * fy, d = ((y - by0) * bw + x - bx0) * 4;
                        for (let ch = 0; ch < 4; ch++)
                            layer[d + ch] = tex[p0 + ch] * f0 + tex[p1 + ch] * f1 + tex[p2 + ch] * f2 + tex[p3 + ch] * f3;
                        if (this.diagnostic !== 'art') {
                            const alpha = layer[d + 3] / 255;
                            for (let ch = 0; ch < 3; ch++)
                                layer[d + ch] = .09 * layer[d + ch] + .91 * alpha * ((1 - u - v) * heatA[ch] + u * heatB[ch] + v * heatC[ch]);
                        }
                    }
            }
            for (let y = by0; y < by1; y++)
                for (let x = bx0; x < bx1; x++) {
                    const a = ((y - by0) * bw + x - bx0) * 4, alpha = layer[a + 3];
                    if (alpha < .01)
                        continue;
                    const b = (y * pw + x) * 4, left = 1 - alpha / 255;
                    for (let ch = 0; ch < 4; ch++)
                        final[b + ch] = layer[a + ch] + final[b + ch] * left;
                }
        }
        const image = this.ctx.createImageData(pw, ph), dest = image.data;
        for (let i = 0; i < final.length; i += 4) {
            const a = final[i + 3];
            if (a < .01)
                continue;
            const f = 255 / a;
            dest[i] = final[i] * f;
            dest[i + 1] = final[i + 1] * f;
            dest[i + 2] = final[i + 2] * f;
            dest[i + 3] = a;
        }
        this.ctx.putImageData(image, 0, 0);
        return this.canvas;
    }
    getMeshes() { return [...this.surfaces.values()]; }
    weldBindings() {
        const nodes = [], offset = new Map(), parent = [];
        for (const [id, m] of this.surfaces) {
            offset.set(id, nodes.length);
            for (let i = 0; i < m.bind.length; i++) {
                parent.push(nodes.length);
                nodes.push({ part: id, index: i });
            }
        }
        const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
        const lookup = new Map();
        for (const [id, m] of this.surfaces)
            lookup.set(id, new Map(m.bind.map((v, i) => [v.x + ',' + v.y, i])));
        const visible = (m, v) => { const x = v.x - m.part.x, y = v.y - m.part.y; if (x < 0 || y < 0 || x >= m.part.w || y >= m.part.h)
            return false; return m.alpha[(Math.round(y) * m.part.w + Math.round(x)) * 4 + 3] > 96; };
        const kinds = new Map();
        for (const seam of SEAM_REGIONS) {
            const a = this.surfaces.get(seam.a), b = this.surfaces.get(seam.b);
            a.bind.forEach((v, i) => { if (v.y < seam.y0 || v.y > seam.y1)
                return; const j = lookup.get(seam.b).get(v.x + ',' + v.y); if (j === undefined || !visible(a, v) || !visible(b, v))
                return; const aa = find(offset.get(seam.a) + i), bb = find(offset.get(seam.b) + j); parent[bb] = aa; kinds.set(aa, seam.kind); });
        }
        const groups = new Map();
        nodes.forEach((n, i) => { const root = find(i); if (!groups.has(root))
            groups.set(root, []); groups.get(root).push(n); });
        for (const [root, members] of groups) {
            if (members.length < 2)
                continue;
            const weights = [];
            for (const n of members)
                weights.push(...this.surfaces.get(n.part).bindings[n.index].weights);
            const kind = kinds.get(root) || 'shared seam';
            const b = { weights: kind.startsWith('shoulder-') ? [{ bone: 'clavicle-' + kind.slice(-1), weight: 1 }] : normalizeWeights(weights), locked: true, corrective: 0, region: kind };
            for (const n of members)
                this.surfaces.get(n.part).bindings[n.index] = b;
            this.weldGroups.push({ kind: b.region, members });
        }
        // Diffuse the seam neighborhood, without ever changing a welded binding.
        // Neighbors are connected vertices in the actual local topology, not unrelated
        // nearby limbs in image space. Three passes remove abrupt weight steps.
        for (let pass = 0; pass < 3; pass++)
            for (const m of this.surfaces.values()) {
                const adjacent = Array.from({ length: m.bind.length }, () => new Set());
                for (let i = 0; i < m.indices.length; i += 3)
                    for (let a = 0; a < 3; a++)
                        for (let b = 0; b < 3; b++)
                            if (a !== b)
                                adjacent[m.indices[i + a]].add(m.indices[i + b]);
                const next = m.bindings.map(b => ({ ...b, weights: b.weights.map(q => ({ ...q })) }));
                m.bindings.forEach((b, i) => {
                    if (b.locked)
                        return;
                    const near = [...adjacent[i]].filter(j => m.bindings[j].locked || m.bindings[j].region === 'seam blend');
                    if (!near.length)
                        return;
                    next[i].weights = normalizeWeights([...b.weights.map(q => ({ ...q, weight: q.weight * .58 })), ...near.flatMap(j => m.bindings[j].weights.map(q => ({ ...q, weight: q.weight * .42 / near.length })))]);
                    next[i].region = 'seam blend';
                    next[i].corrective *= .6;
                });
                m.bindings = next.map((b, i) => m.bindings[i].locked ? m.bindings[i] : b);
            }
    }
    ramp(t) { const stops = [[22, 55, 180], [22, 171, 218], [52, 201, 133], [242, 211, 64], [231, 70, 65]], u = Math.max(0, Math.min(.99999, t)) * 4, i = Math.floor(u), f = u - i; return stops[i].map((v, j) => v + (stops[i + 1][j] - v) * f); }
    bindingColor(b) {
        if (this.diagnostic === 'corrective')
            return this.ramp(b.corrective);
        if (this.diagnostic === 'seams')
            return b.locked ? [255, 206, 82] : b.region === 'seam blend' ? [91, 212, 206] : [48, 58, 77];
        if (this.selectedBone !== 'all')
            return this.ramp(b.weights.find(w => w.bone === this.selectedBone)?.weight ?? 0);
        const c = [0, 0, 0];
        for (const q of b.weights) {
            const hex = BONE_PALETTE[q.bone] ?? '#888888';
            for (let i = 0; i < 3; i++)
                c[i] += parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) * q.weight;
        }
        return c;
    }
    strainColor(min, max, area) { if (area <= 0)
        return [230, 34, 225]; const stretch = Math.max(0, max - 1), compression = Math.max(0, 1 - min); if (stretch < .05 && compression < .05)
        return [66, 191, 139]; return stretch >= compression ? this.ramp(.5 + Math.min(.5, stretch / 1.1)) : this.ramp(.5 - Math.min(.5, compression / .8)); }
    exportSkin() { return { version: 5, format: 'normalized-dq-skin-weights', sourceHash: this.sourceHash, canvas: [512, 1100], palette: { ...BONE_PALETTE }, parts: [...this.surfaces].map(([id, m]) => ({ id, vertices: m.bind.map((v, i) => ({ x: v.x, y: v.y, ...m.bindings[i], weights: m.bindings[i].weights.map(w => ({ ...w })) })), triangles: [...m.indices], opaque: [...m.opaque] })), weldGroups: this.weldGroups.map(g => ({ kind: g.kind, members: g.members.map(m => ({ ...m })) })) }; }
    loadSkin(data) {
        const d = data;
        if (d?.version !== 5 || d.format !== 'normalized-dq-skin-weights' || d.sourceHash !== this.sourceHash || d.parts.length !== this.surfaces.size || new Set(d.parts.map(p => p.id)).size !== this.surfaces.size)
            throw new Error('Invalid weight format');
        // Check every part before mutating any binding.
        for (const part of d.parts) {
            const m = this.surfaces.get(part.id);
            if (!m || part.vertices.length !== m.bind.length)
                throw new Error('Weight mesh does not match ' + part.id);
            part.vertices.forEach((v, i) => { if (v.x !== m.bind[i].x || v.y !== m.bind[i].y || !Array.isArray(v.weights) || v.weights.length < 1 || v.weights.length > 4 || new Set(v.weights.map(q => q.bone)).size !== v.weights.length || !Number.isFinite(v.corrective) || v.corrective < 0 || v.corrective > .98 || v.locked !== m.bindings[i].locked || v.weights.some(q => !(q.bone in BONE_PALETTE) || q.weight < 0 || !Number.isFinite(q.weight)) || Math.abs(v.weights.reduce((a, q) => a + q.weight, 0) - 1) > 1e-5)
                throw new Error('Invalid normalized binding'); });
        }
        for (const part of d.parts) {
            const m = this.surfaces.get(part.id);
            m.bindings = part.vertices.map(v => ({ weights: normalizeWeights(v.weights), corrective: Math.max(0, Math.min(.98, v.corrective)), locked: !!v.locked, region: v.region }));
        }
        for (const g of this.weldGroups) {
            const first = g.members[0], b = this.surfaces.get(first.part).bindings[first.index];
            b.corrective = 0;
            b.locked = true;
            for (const n of g.members)
                this.surfaces.get(n.part).bindings[n.index] = b;
        }
    }
    auditWeights() { let invalid = 0, unweighted = 0, maxSumError = 0, maxInfluences = 0, count = 0; for (const m of this.surfaces.values())
        for (const b of m.bindings) {
            count++;
            const sum = b.weights.reduce((a, q) => a + q.weight, 0);
            maxSumError = Math.max(maxSumError, Math.abs(sum - 1));
            maxInfluences = Math.max(maxInfluences, b.weights.length);
            if (!b.weights.length)
                unweighted++;
            if (b.weights.some(q => !Number.isFinite(q.weight) || q.weight < 0 || !(q.bone in BONE_PALETTE)) || Math.abs(sum - 1) > 1e-6)
                invalid++;
        } return { vertices: count, invalid, unweighted, maxSumError, maxInfluences, weldGroups: this.weldGroups.length, weightsNormalized: invalid === 0 }; }
    inspectVertex(point) {
        let best = null;
        for (const [id, m] of this.surfaces) {
            const posed = this.lastPoints.get(id);
            if (!posed)
                continue;
            for (let i = 0; i < m.bind.length; i++) {
                const v = m.bind[i], tx = Math.round(v.x - m.part.x), ty = Math.round(v.y - m.part.y);
                if (tx < 0 || ty < 0 || tx >= m.part.w || ty >= m.part.h || m.alpha[(ty * m.part.w + tx) * 4 + 3] < 120)
                    continue;
                const d = Math.hypot(point.x - posed[i].x, point.y - posed[i].y);
                if (!best || d < best.distance)
                    best = { part: id, index: i, distance: d, x: v.x, y: v.y, ...m.bindings[i] };
            }
        }
        return best;
    }
    destroy() { this.surfaces.clear(); this.canvas.width = 1; this.canvas.height = 1; }
}
