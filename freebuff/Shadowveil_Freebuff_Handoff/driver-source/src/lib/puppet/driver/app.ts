import { SurfaceRenderer } from '../pose-v5/surface.js';
import { neutral, type V } from '../pose-v5/core.js';
import { imageLoad, cameraFor, type Atlas, type Images } from '../pose-v5/render.js';
import { type DriverPose, type Axis, evaluateDriver, constrainPose, withAngle, neutralDriver, bindSurfaces, projectShape, artCoverage, interpolatePose, toBind, type BoundShape } from './driver.js';
import { type Vec3, type View3, toXYZ, project3, v3, minus } from './math3.js';
import { type ProjectDoc, type GuideRecord, type Diagnostic, createProject, revise, inspectGuideHTML, stageGuide, approveGuide, validateProject, shaText, firstBatch } from './document.js';
import { ProjectStore } from './storage.js';
import { beginNodeGrab, solveNodeGrab, projectScreen, screenSide, pickNode,
    rotateInView, shortestDegrees, RING_RADIUS, type NodeGrab } from './controls.js';
import { jointPresentation, validLabelBasis, type LabelBasis } from './labels.js';
export interface MountOptions {
    assets: Record<string, string>;
    assetSetId: string;
    signal?: AbortSignal;
}
export interface DriverAPI {
    getProject(): ProjectDoc;
    setAngle(id: string, axis: Axis, value: number): void;
    setCamera(v: Partial<View3>): void;
    setOverlay(show: boolean): void;
    setLabelBasis(basis: LabelBasis): void;
    setDiagnostic(v: Diagnostic): void;
    setPose(p: DriverPose): void;
    importGuide(text: string, name: string): Promise<void>;
    approveGuide(id: string): void;
    exportProject(): Promise<string>;
    importProject(text: string): Promise<void>;
    save(): Promise<void>;
    undo(): void;
    metrics(): unknown;
    destroy(): void;
    canvas: HTMLCanvasElement;
}

export async function mount(host: HTMLElement, opts: MountOptions): Promise<DriverAPI> {
    let alive = true;
    const atlas = JSON.parse(opts.assets['atlas.json']) as Atlas;
    const images: Images = {};
    await Promise.all(atlas.parts.map(async (p) => { images[p.id] = await imageLoad(opts.assets[p.src]); }));
    if (opts.signal?.aborted)
        throw new DOMException('Mount cancelled', 'AbortError');
    const surface = new SurfaceRenderer(atlas, images);
    surface.loadSkin(JSON.parse(opts.assets['skin-weights.json']));
    const sourceHash = atlas.source_sha256!;
    let doc = createProject(opts.assetSetId, sourceHash), pending: GuideRecord | null = null, storageAvailable = false, saveMessage = 'Autosave not initialized', notice = 'Provisional front-art pilot. Definitive Meta AI guide has not been supplied.', noticeBad = false;
    const store = new ProjectStore();
    try {
        await store.open();
        const raw = await store.load();
        if (raw)
            doc = await validateProject(raw, opts.assetSetId, sourceHash);
        storageAvailable = true;
        saveMessage = raw ? 'Restored project from this browser' : 'Autosave available on this origin';
    }
    catch (e) {
        saveMessage = 'Autosave unavailable or restore rejected — export a backup';
        notice = String(e);
        noticeBad = true;
    }
    const history: ProjectDoc[] = [];
    let timer = 0, raf = 0;
    let shape = bindSurfaces(evaluateDriver(doc.driver, doc.pose), [...surface.surfaces.values()], surface.weldGroups);
    if (!shape.accepted)
        throw new Error('Restored pose violates the surface envelope');
    let drawMs = 0, drawCount = 0, saveEpoch = 0;
    if (opts.signal?.aborted) {
        surface.destroy();
        store.close();
        throw new DOMException('Mount cancelled', 'AbortError');
    }
    host.innerHTML = `<div class="cd-shell">
 <header class="cd-head"><div><p class="cd-kicker">CHARACTER DRIVER · FOUNDATION 0.1.2 · SCREEN LABELS</p><h1>Shadowveil</h1><p class="cd-sub">Invisible 3D driver. Illustrated 2D output.</p></div><div class="cd-actions"><button data-action="export">Export project</button><button data-action="open">Open project</button><button data-action="guide" class="cd-accent">Import guide HTML</button></div></header>
 <div class="cd-banner"><span class="cd-dot"></span><strong data-guide-status>Awaiting definitive guide</strong><span>Existing artwork is provisional. No new art has been generated.</span></div>
 <main class="cd-main"><section class="cd-stage" aria-label="Single character viewport"><div class="cd-toolbar"><label>Display <select aria-label="Display" data-display><option value="art">2D artwork</option><option value="weights">Actual weights</option><option value="seams">Shared seams</option></select></label><label class="cd-check"><input type="checkbox" data-overlay>Driver overlay</label><label>Input <select aria-label="Input mode" data-interaction><option value="pose">Place nodes / rotate ring</option><option value="orbit">Orbit camera</option></select></label><label>Labels <select aria-label="Joint label convention" data-label-basis><option value="screen">Screen left / right</option><option value="anatomical">Character anatomy</option></select></label></div><div class="cd-canvas-wrap"><canvas aria-label="Shadowveil driver and 2D artwork" tabindex="0"></canvas><div class="cd-unsupported" hidden><strong>Registered artwork unavailable</strong><p data-unavailable></p><button data-action="front">Return to front</button></div><div class="cd-input-hint" data-input-hint>Screen labels match this view. Round node = position; ring = rotate. Anatomy IDs stay fixed.</div><div class="cd-view-label" data-view-label></div></div><div class="cd-camera"><div class="cd-bookmarks"><button data-view="0">Front</button><button data-view="45">¾</button><button data-view="90">Side</button><button data-view="180">Back</button><label><select data-background aria-label="Background"><option value="dark">Dark</option><option value="light">Light</option><option value="checker">Checkerboard</option></select></label></div><label>Camera yaw <output data-yaw-read></output><input data-yaw aria-label="Camera yaw" type="range" min="-180" max="180" step="1"></label><label>Camera pitch <output data-pitch-read></output><input data-pitch aria-label="Camera pitch" type="range" min="-60" max="60" step="1"></label></div></section>
 <aside class="cd-inspector"><div class="cd-section"><p class="cd-kicker">ONE PERSISTENT PROJECT</p><div class="cd-status" data-project></div><p class="cd-small" data-storage></p></div><div class="cd-section"><div class="cd-section-title"><h2>Driver control</h2><span class="cd-badge">PROVISIONAL</span></div><label>Selected joint<select aria-label="Selected joint" data-bone></select></label><p class="cd-small" data-bone-hint></p><div class="cd-row cd-nudge" aria-label="Screen-space node movement"><button data-nudge="-5,0" aria-label="Move selected node screen-left">← Left</button><button data-nudge="5,0" aria-label="Move selected node screen-right">Right →</button><button data-nudge="0,-5" aria-label="Move selected node screen-up">↑ Up</button><button data-nudge="0,5" aria-label="Move selected node screen-down">↓ Down</button></div><p class="cd-small">Node = position via its parent chain. Ring = rotate this bone. Limits stop unreachable targets; they do not reverse your drag.</p><div data-sliders></div><p class="cd-small">Advanced local XYZ angles (not screen left/right); stored as quaternions. Envelopes are temporary art constraints, not anatomical approval.</p><div class="cd-row"><button data-action="neutral">Neutral</button><button data-action="gesture">Gentle lift</button><button data-action="depth">Depth test</button><button data-action="undo">Undo</button></div></div>
 <details class="cd-section" data-guide-panel><summary>Definitive guide & revision review</summary><p class="cd-small">Ordinary HTML is accepted as an inert reference. Optional structured data is staged, never executed or applied automatically.</p><div data-guide-info></div><button data-action="approve" disabled>Approve selected reference</button><p class="cd-small">Approval invalidates old artwork registration. The current skeleton is retained for comparison; measurements are not auto-fitted.</p></details>
 <details class="cd-section"><summary>First art batch · 12 planned assets</summary><p class="cd-small">Anatomical right arm across front, right three-quarter and right profile. Waiting for the guide and registration proof.</p><div data-queue></div><button data-action="queue">Export batch specification</button></details>
 <details class="cd-section"><summary>Pose library & project data</summary><div class="cd-row"><button data-action="save-pose">Save pose</button><button data-action="save-now">Save project now</button></div><div data-library></div><p class="cd-small">Project export includes the seed PNGs, numeric weights, hidden rig, pose, cameras, guide revisions and batch queue.</p></details>
 <div class="cd-section"><h2>Binding checks</h2><div class="cd-metrics" data-metrics></div><p class="cd-small">Metrics use the 3D bound surface before camera projection. Guide depth, registration and corrective authoring remain pending.</p></div></aside></main>
 <footer class="cd-footer"><span data-notice role="status"></span><span>Front registration pilot · not an all-angle rig</span></footer>
 <input type="file" data-file-guide accept=".html,.htm,text/html" hidden><input type="file" data-file-project accept=".json,.character,application/json" hidden>
 </div>`;
    const el = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
    const canvas = el<HTMLCanvasElement>('canvas'), ctx = canvas.getContext('2d')!;
    if (!ctx)
        throw new Error('Canvas 2D is unavailable');
    const cameraEl = el<HTMLElement>('.cd-canvas-wrap');
    let fit = cameraFor(400, 600), width = 400, height = 600, dpr = 1;
    const bones = el<HTMLSelectElement>('[data-bone]');
    for (const b of doc.driver.bones) {
        const o = document.createElement('option');
        o.value = b.id;
        o.textContent = jointPresentation(b.id, evaluateDriver(doc.driver, doc.pose), doc.workspace.camera, doc.workspace.labelBasis ?? 'screen').primary;
        bones.append(o);
    }
    const sliderElements: Record<string, HTMLInputElement> = {};
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
        const label = document.createElement('label');
        label.className = 'cd-slider';
        const row = document.createElement('span');
        row.textContent = ({ x: 'Local X rotation', y: 'Local Y rotation', z: 'Local Z rotation' })[axis];
        const out = document.createElement('output');
        out.dataset.axisRead = axis;
        row.append(out);
        const input = document.createElement('input');
        input.type = 'range';
        input.step = '0.5';
        input.dataset.axis = axis;
        input.setAttribute('aria-label', row.textContent);
        label.append(row, input);
        el('[data-sliders]').append(label);
        sliderElements[axis] = input;
        let begun = false;
        const begin = () => { if (!begun) {
            remember();
            begun = true;
        } };
        input.addEventListener('pointerdown', begin);
        input.addEventListener('input', () => { begin(); setPose(withAngle(doc.pose, doc.workspace.selectedBone, axis, Number(input.value)), false); });
        input.addEventListener('change', () => begun = false);
        input.addEventListener('keyup', () => begun = false);
    }
    function remember() { history.push(structuredClone(doc)); if (history.length > 20)
        history.shift(); }
    function status(text: string, bad = false) { notice = text; noticeBad = bad; syncStatus(); }
    function syncStatus() { if (!alive)
        return; el('[data-notice]').textContent = notice; el('[data-notice]').classList.toggle('cd-warning', noticeBad); el('[data-storage]').textContent = saveMessage; el('[data-project]').textContent = `${doc.name} · r${doc.revision}\n${doc.id}`; el<HTMLButtonElement>('[data-action="undo"]').disabled = history.length === 0; }
    async function save() { const epoch = ++saveEpoch; clearTimeout(timer); try {
        if (!storageAvailable)
            throw new Error('Browser storage is unavailable');
        await store.save(doc);
        if (epoch === saveEpoch) {
            saveMessage = 'Saved locally · revision ' + doc.revision;
            syncStatus();
        }
    }
    catch (e) {
        saveMessage = 'Not saved locally — export a project backup';
        syncStatus();
        throw e;
    } }
    function scheduleSave() { saveMessage = storageAvailable ? 'Saving…' : 'Autosave unavailable — export a backup'; syncStatus(); clearTimeout(timer); timer = window.setTimeout(() => { save().catch(() => { }); }, 350); }
    function commit(edit: (d: ProjectDoc) => void) { doc = revise(doc, edit); scheduleSave(); syncControls(); requestDraw(); }
    let lastManipulation: Record<string, unknown> | null = null;
    let targetMarker: {position: Vec3; camera: View3; limited: boolean} | null = null;
    function setPose(raw: DriverPose, saveHistory = true,
        screenRequest?: {grab: NodeGrab; dx: number; dy: number; target: Vec3; limited: boolean}) {
        // Returning to a grab's origin restores an already accepted snapshot exactly.
        // Re-encoding its quaternions would introduce round-trip drift on cancel/undo.
        const clamped = screenRequest && Math.hypot(screenRequest.dx,screenRequest.dy)<1e-8
            ? {pose:structuredClone(screenRequest.grab.pose),reasons:[] as string[]}
            : constrainPose(doc.driver, raw);
        let accepted = clamped.pose, b = bindSurfaces(evaluateDriver(doc.driver, accepted), [...surface.surfaces.values()], surface.weldGroups), reasons = [...clamped.reasons];
        if (!b.accepted) {
            reasons.push(...b.reasons);
            let low = 0, high = 1;
            accepted = doc.pose;
            b = shape;
            for (let i = 0; i < 10; i++) {
                const t = (low + high) / 2, candidate = constrainPose(doc.driver, interpolatePose(doc.pose, clamped.pose, t)).pose, q = bindSurfaces(evaluateDriver(doc.driver, candidate), [...surface.surfaces.values()], surface.weldGroups);
                if (q.accepted) {
                    low = t;
                    accepted = candidate;
                    b = q;
                }
                else
                    high = t;
            }
        }
        if (screenRequest) {
            const {grab, target, dx, dy} = screenRequest;
            const before=project3(evaluateDriver(doc.driver,doc.pose)[grab.bone].position,grab.camera);
            let after=project3(evaluateDriver(doc.driver,accepted)[grab.bone].position,grab.camera);
            const t=project3(target,grab.camera);
            const stepX=(after.x-before.x)*grab.scale, stepY=-(after.y-before.y)*grab.scale;
            const goalX=(t.x-before.x)*grab.scale, goalY=-(t.y-before.y)*grab.scale;
            // Surface clamping can change the apparent direction too. Check the FINAL candidate.
            if ((Math.abs(goalX)>.25 && stepX*Math.sign(goalX)<-.05)
                || (Math.abs(goalY)>.25 && stepY*Math.sign(goalY)<-.05)
                || Math.hypot(after.x-t.x,after.y-t.y)>Math.hypot(before.x-t.x,before.y-t.y)+.05/grab.scale) {
                accepted=doc.pose; b=shape; after=before;
                reasons.push('Requested screen direction blocked by current limits');
            }
            const error=Math.hypot(after.x-t.x,after.y-t.y)*grab.scale;
            const start=project3(grab.start,grab.camera);
            lastManipulation={kind:'node-placement',node:grab.bone,requested:{dx,dy},
                actual:{dx:(after.x-start.x)*grab.scale,dy:-(after.y-start.y)*grab.scale},
                errorPixels:error,limited:screenRequest.limited||error>.8||reasons.length>0};
            targetMarker={position:target,camera:{...grab.camera},limited:Boolean(lastManipulation.limited)};
            if (error>.8) reasons.push(`Target limited · ${error.toFixed(1)} screen px short`);
        } else {targetMarker=null;lastManipulation=null;}
        if (saveHistory)
            remember();
        shape = b;
        commit(n => n.pose = structuredClone(accepted));
        status(reasons.length ? 'Request limited: ' + [...new Set(reasons)].join(' · ') : 'Driver pose updated. Existing front artwork remains provisional.', reasons.length > 0);
    }
    function setCamera(v: Partial<View3>) { if (drag && drag.kind !== 'orbit') cancelDrag(); targetMarker=null; const c = { ...doc.workspace.camera, ...v }; if (!Object.values(c).every(Number.isFinite))
        throw new Error('Invalid camera'); c.yaw = Math.max(-180, Math.min(180, c.yaw)); c.pitch = Math.max(-60, Math.min(60, c.pitch)); c.zoom = Math.max(.5, Math.min(1.5, c.zoom)); commit(n => n.workspace.camera = c); }
    function syncControls() {
        if (!alive)
            return;
        const w = doc.workspace;
        bones.value = w.selectedBone;
        const def = doc.driver.bones.find(b => b.id === w.selectedBone)!, a = toXYZ(doc.pose.rotations[def.id]);
        for (const axis of ['x', 'y', 'z'] as Axis[]) {
            const input = sliderElements[axis];
            input.min = String(def.limits[axis][0]);
            input.max = String(def.limits[axis][1]);
            input.value = String(a[axis]);
            el(`[data-axis-read="${axis}"]`).textContent = a[axis].toFixed(1) + '°';
        }
        const world = evaluateDriver(doc.driver,doc.pose), basis = w.labelBasis ?? 'screen';
        // Refresh text in place: values and selected bone remain stable as labels change.
        for (const option of bones.options) {
            const label = jointPresentation(option.value, world, w.camera, basis);
            const text = label.primary + ' [' + option.value + ']';
            if (option.textContent !== text) option.textContent = text;
            option.title = label.detail;
        }
        const label = jointPresentation(def.id, world, w.camera, basis);
        el<HTMLSelectElement>('[data-label-basis]').value = basis;
        el('[data-input-hint]').textContent = basis === 'screen'
            ? 'SCREEN LABELS · Left/right follow the visible node relative to the pelvis. Drag in screen directions.'
            : 'ANATOMY LABELS · Left/right belong to the character. Drag still follows screen directions.';
        el('[data-bone-hint]').textContent = label.primary + ' · ' + label.detail + ' · ' + screenSide(def.id,world,w.camera)
            + ' · parent: ' + (def.parent ?? 'world') + (def.id.startsWith('upper-')||def.id.startsWith('clavicle-')
            ? '. Shoulder socket position follows the torso; use the ring to swing the arm.' : '');
        el<HTMLInputElement>('[data-yaw]').value = String(w.camera.yaw);
        el('[data-yaw-read]').textContent = Math.round(w.camera.yaw) + '°';
        el<HTMLInputElement>('[data-pitch]').value = String(w.camera.pitch);
        el('[data-pitch-read]').textContent = Math.round(w.camera.pitch) + '°';
        el<HTMLInputElement>('[data-overlay]').checked = w.showDriver;
        el<HTMLSelectElement>('[data-display]').value = w.diagnostic;
        el<HTMLSelectElement>('[data-background]').value = w.background;
        el<HTMLSelectElement>('[data-interaction]').value = w.interaction;
        syncStatus();
    }
    function syncGuide() {
        const active = doc.guides.find(g => g.id === doc.activeGuideId);
        el('[data-guide-status]').textContent = active ? 'Approved reference · re-registration pending' : 'Awaiting definitive guide';
        const box = el('[data-guide-info]');
        box.replaceChildren();
        for (const g of doc.guides) {
            const card = document.createElement('div');
            card.className = 'cd-guide-card';
            const title = document.createElement('strong');
            title.textContent = g.title;
            const meta = document.createElement('p');
            meta.className = 'cd-small';
            meta.textContent = `${g.status.toUpperCase()} · ${g.name}\nSHA-256 ${g.sha256}\n${g.metadataWarning}`;
            const pre = document.createElement('pre');
            pre.textContent = g.summary.slice(0, 1800);
            const button = document.createElement('button');
            button.textContent = 'Select this revision';
            button.addEventListener('click', () => { pending = g; syncGuide(); });
            card.append(title, meta, pre, button);
            if (pending?.id === g.id)
                card.classList.add('selected');
            box.append(card);
        }
        if (!doc.guides.length) {
            const p = document.createElement('p');
            p.textContent = 'No definitive guide has been imported. The project is ready to receive it.';
            box.append(p);
        }
        el<HTMLButtonElement>('[data-action="approve"]').disabled = !pending || pending.id === doc.activeGuideId;
    }
    function syncQueue() { const box = el('[data-queue]'); box.replaceChildren(); for (const t of doc.queue) {
        const p = document.createElement('p');
        p.className = 'cd-queue-item';
        const bold = document.createElement('strong');
        bold.textContent = t.kind + ' · ' + t.view;
        const span = document.createElement('span');
        span.textContent = t.id + '\nAwaiting guide + registration';
        p.append(bold, span);
        box.append(p);
    } }
    function syncLibrary() { const b = el('[data-library]'); b.replaceChildren(); for (const p of doc.savedPoses) {
        const button = document.createElement('button');
        button.textContent = p.name;
        button.addEventListener('click', () => setPose(p.pose));
        b.append(button);
    } }
    function requestDraw() { if (!raf && alive)
        raf = requestAnimationFrame(draw); }
    function draw() {
        raf = 0;
        if (!alive)
            return;
        const start = performance.now(), r = cameraEl.getBoundingClientRect();
        width = Math.max(100, r.width);
        height = Math.max(180, r.height);
        dpr = Math.min(1.5, devicePixelRatio || 1);
        const pw = Math.round(width * dpr), ph = Math.round(height * dpr);
        if (canvas.width !== pw)
            canvas.width = pw;
        if (canvas.height !== ph)
            canvas.height = ph;
        fit = cameraFor(width, height, doc.workspace.camera.zoom);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const bg = doc.workspace.background;
        ctx.fillStyle = bg === 'dark' ? '#111922' : bg === 'light' ? '#f3f0e9' : '#d8dcdd';
        ctx.fillRect(0, 0, width, height);
        if (bg === 'checker') {
            ctx.fillStyle = '#b9c1c5';
            for (let y = 0; y < height; y += 20)
                for (let x = 0; x < width; x += 20)
                    if ((x / 20 + y / 20) % 2 === 0)
                        ctx.fillRect(x, y, 20, 20);
        }
        const w = doc.workspace, world = evaluateDriver(doc.driver, doc.pose), coverage = artCoverage(doc.pose, w.camera, doc.registration.status);
        const projected = projectShape(shape, w.camera);
        surface.diagnostic = w.diagnostic;
        surface.selectedBone = w.selectedBone;
        if (coverage.supported) {
            const right = project3(world['hand-R'].position, w.camera).z, left = project3(world['hand-L'].position, w.camera).z;
            const front = right >= left ? 'R' : 'L', back = front === 'R' ? 'L' : 'R';
            const order = ['foot-R', 'foot-L', 'leg-R', 'leg-L', 'arm-R:back', 'arm-L:back', 'torso', 'head', 'arm-' + back + ':front', 'hand-' + back, 'arm-' + front + ':front', 'hand-' + front];
            const im = surface.draw(neutral(), fit, width, height, dpr, order, projected);
            ctx.drawImage(im, 0, 0, width, height);
        }
        if (w.showDriver) {
            drawDriver(world);
        }
        el<HTMLElement>('.cd-unsupported').hidden = coverage.supported;
        el('[data-unavailable]').textContent = coverage.reason + (w.showDriver ? '' : ' Enable Driver overlay to inspect the retained pose.');
        el('[data-view-label]').textContent = coverage.supported ? 'FRONT ART · ' + Math.round(w.camera.yaw) + '° CAMERA · PROVISIONAL' : 'DRIVER-ONLY ANGLE · NO REGISTERED ART';
        const lines = [['Bindings', surface.auditWeights().vertices.toLocaleString()], ['Shared groups', surface.weldGroups.length.toString()], ['3D local scale', shape.minScale.toFixed(3) + '–' + shape.maxScale.toFixed(3) + '×'], ['Attachment gap', shape.seamGap.toExponential(1) + ' px'], ['Guide', doc.activeGuideId ? 'Re-registration needed' : 'Awaiting HTML']];
        const m = el('[data-metrics]');
        m.replaceChildren();
        for (const [a, b] of lines) {
            const row = document.createElement('p'), val = document.createElement('strong');
            row.textContent = a;
            val.textContent = b;
            row.append(val);
            m.append(row);
        }
        drawMs = performance.now() - start;
        drawCount++;
    }
    function screen(p: Vec3) { return projectScreen(p, doc.workspace.camera, fit); }
    function drawDriver(world: ReturnType<typeof evaluateDriver>) {
        ctx.save();
        ctx.strokeStyle = '#56d7cb';
        ctx.fillStyle = '#b8eee5';
        ctx.lineWidth = 1.25;
        for (const b of doc.driver.bones) {
            if (!b.parent)
                continue;
            const a = screen(world[b.parent].position), p = screen(world[b.id].position);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
        for (const b of doc.driver.bones) {
            const p = screen(world[b.id].position), selected = b.id === doc.workspace.selectedBone;
            ctx.fillStyle = selected ? '#ffc56a' : '#b8eee5';
            ctx.beginPath();
            ctx.arc(p.x, p.y, selected ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
            if (selected) {
                ctx.font = '12px system-ui';
                ctx.strokeStyle = '#10212d';
                ctx.lineWidth = 4;
                const text = jointPresentation(b.id, world, doc.workspace.camera, doc.workspace.labelBasis ?? 'screen').primary;
                const tw = ctx.measureText(text).width;
                // Keep the complete label inside a phone viewport, including screen-right nodes.
                const tx = Math.max(8, Math.min(width - tw - 8, p.x + 10));
                const ty = Math.max(65, Math.min(height - 25, p.y - 15));
                ctx.strokeText(text, tx, ty);
                ctx.fillText(text, tx, ty);
            }
        }
        const center=screen(world[doc.workspace.selectedBone].position);
        ctx.strokeStyle='#ffc56a'; ctx.lineWidth=1.4;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.arc(center.x,center.y,RING_RADIUS,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        if (targetMarker && targetMarker.limited) {
            const t=screen(targetMarker.position);ctx.strokeStyle='#f0a468';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(t.x-6,t.y);ctx.lineTo(t.x+6,t.y);ctx.moveTo(t.x,t.y-6);ctx.lineTo(t.x,t.y+6);ctx.stroke();
            ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.setLineDash([]);
        }
        // Markers use the same presentation function as picking labels and the inspector.
        // Never turn screen convention into an ID remap or an artwork mirror operation.
        ctx.font='bold 10px system-ui';
        let overlapDrawn = false;
        for (const side of ['R','L']) {
            const id = 'upper-' + side, p = screen(world[id].position);
            const label = jointPresentation(id, world, doc.workspace.camera, doc.workspace.labelBasis ?? 'screen');
            if (label.location === 'overlap' && (doc.workspace.labelBasis ?? 'screen') === 'screen') {
                if (overlapDrawn) continue;
                overlapDrawn = true;
            }
            const tw = ctx.measureText(label.marker).width;
            const left = label.location === 'left' || (label.location === 'overlap' && side === 'R' && doc.workspace.labelBasis === 'anatomical');
            const tx = Math.max(6, Math.min(width - tw - 6, left ? p.x - tw - 8 : p.x + 8));
            ctx.fillStyle='#83dbd0';ctx.strokeStyle='#10212d';ctx.lineWidth=3;
            ctx.strokeText(label.marker,tx,p.y-10);ctx.fillText(label.marker,tx,p.y-10);
        }
        // A simple depth axis confirms 3D orientation; it is never part of the illustration.
        const o = { x: 45, y: height - 36 };
        for (const [axis, color, label] of [[v3(25, 0, 0), '#efaaa5', 'X'], [v3(0, 25, 0), '#a7d697', 'Y'], [v3(0, 0, 25), '#99bfe9', 'Z']] as const) {
            const p = project3(axis, doc.workspace.camera);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(o.x, o.y);
            ctx.lineTo(o.x + p.x, o.y - p.y);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillText(label, o.x + p.x + 3, o.y - p.y);
        }
        ctx.restore();
    }
    function download(name: string, text: string, type = 'application/json') { const u = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000); }
    async function exportProject() { const payload = JSON.stringify({ format: 'shadowveil-character-package/1', project: doc, resources: opts.assets }); const hash = await shaText(payload); return JSON.stringify({ format: 'shadowveil-checksummed-package/1', sha256: hash, payload }, null, 2); }
    async function importProject(text: string) { if (new TextEncoder().encode(text).length > 64 * 1024 * 1024)
        throw new Error('Project package exceeds 64 MiB'); const outer = JSON.parse(text); if (outer.format !== 'shadowveil-checksummed-package/1' || typeof outer.payload !== 'string' || await shaText(outer.payload) !== outer.sha256)
        throw new Error('Project checksum mismatch'); const pkg = JSON.parse(outer.payload); if (pkg.format !== 'shadowveil-character-package/1' || JSON.stringify(pkg.resources) !== JSON.stringify(opts.assets))
        throw new Error('Unrecognized embedded asset set: registration review is required'); const imported = await validateProject(pkg.project, opts.assetSetId, sourceHash); const b = bindSurfaces(evaluateDriver(imported.driver, imported.pose), [...surface.surfaces.values()], surface.weldGroups); if (!b.accepted)
        throw new Error('Imported surface exceeds pilot envelopes'); for (const p of imported.savedPoses)
        if (!bindSurfaces(evaluateDriver(imported.driver, p.pose), [...surface.surfaces.values()], surface.weldGroups).accepted)
            throw new Error('Saved pose exceeds surface envelope'); remember(); doc = imported; shape = b; pending = null; syncControls(); syncGuide(); syncLibrary(); syncQueue(); scheduleSave(); requestDraw(); status('Project restored, including rig pose, camera, source identity and guide revisions.'); }
    async function importGuide(text: string, name: string) { const guide = await inspectGuideHTML(text, name); remember(); doc = stageGuide(doc, guide); pending = guide; el<HTMLDetailsElement>('[data-guide-panel]').open = true; syncGuide(); syncControls(); scheduleSave(); status('Guide staged only. No scripts executed; no calibration changed.'); }
    function approve(id: string) { remember(); doc = approveGuide(doc, id); pending = doc.guides.find(g => g.id === id) ?? null; syncGuide(); syncControls(); requestDraw(); scheduleSave(); status('Reference approved. Existing bindings marked for re-registration; no automatic fitting performed.', true); }
    function undo() { const old = history.pop(); if (!old)
        return; const revision = doc.revision; doc = old; doc.revision = revision + 1; doc.updatedAt = new Date().toISOString(); shape = bindSurfaces(evaluateDriver(doc.driver, doc.pose), [...surface.surfaces.values()], surface.weldGroups); pending = null; syncControls(); syncGuide(); syncQueue(); syncLibrary(); scheduleSave(); requestDraw(); status('Previous project checkpoint restored.'); }
    const actions: Record<string, () => void | Promise<void>> = { export: async () => download('Shadowveil.character.json', await exportProject()), open: () => el<HTMLInputElement>('[data-file-project]').click(), guide: () => el<HTMLInputElement>('[data-file-guide]').click(), approve: () => { if (pending)
            approve(pending.id); }, front: () => setCamera({ yaw: 0, pitch: 0 }), neutral: () => setPose(neutralDriver(doc.driver)), gesture: () => { let p = neutralDriver(doc.driver); p = withAngle(p, 'upper-R', 'z', -18); p = withAngle(p, 'forearm-R', 'z', -28); p = withAngle(p, 'hand-R', 'z', 5); setPose(p); }, depth: () => { let p = neutralDriver(doc.driver); p = withAngle(p, 'upper-R', 'x', 28); p = withAngle(p, 'forearm-R', 'z', -18); setPose(p); commit(n => n.workspace.showDriver = true); }, undo, queue: () => download('Shadowveil_first_12_assets.json', JSON.stringify({ status: 'planning-only', activeGuide: doc.activeGuideId, tasks: doc.queue }, null, 2)), 'save-now': save, 'save-pose': () => { if (doc.savedPoses.length >= 24)
            throw new Error('Pose library is full'); remember(); commit(n => n.savedPoses.push({ id: 'pose-' + Date.now(), name: 'Pose ' + (doc.savedPoses.length + 1), driverRevision: doc.driver.revision, pose: structuredClone(doc.pose) })); syncLibrary(); } };
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-action]'))
        button.addEventListener('click', () => { Promise.resolve().then(() => actions[button.dataset.action!]()).catch(e => status(String(e), true)); });
    bones.addEventListener('change', () => commit(n => n.workspace.selectedBone = bones.value));
    function setLabelBasis(basis: LabelBasis) {
        if (!validLabelBasis(basis)) throw Error('Invalid label basis');
        if (drag) cancelDrag();
        commit(n => n.workspace.labelBasis = basis);
        status(basis === 'screen' ? 'Screen labels enabled. Bone IDs, artwork and input directions are unchanged.'
            : 'Character-anatomy labels enabled. Drag directions still follow the screen.');
    }
    el<HTMLSelectElement>('[data-label-basis]').addEventListener('change', e => setLabelBasis((e.target as HTMLSelectElement).value as LabelBasis));
    el<HTMLInputElement>('[data-overlay]').addEventListener('change', e => commit(n => n.workspace.showDriver = (e.target as HTMLInputElement).checked));
    el<HTMLSelectElement>('[data-display]').addEventListener('change', e => commit(n => n.workspace.diagnostic = (e.target as HTMLSelectElement).value as Diagnostic));
    el<HTMLSelectElement>('[data-background]').addEventListener('change', e => commit(n => n.workspace.background = (e.target as HTMLSelectElement).value as ProjectDoc['workspace']['background']));
    el<HTMLSelectElement>('[data-interaction]').addEventListener('change', e => commit(n => n.workspace.interaction = (e.target as HTMLSelectElement).value as 'pose' | 'orbit'));
    for (const b of host.querySelectorAll<HTMLButtonElement>('[data-view]'))
        b.addEventListener('click', () => setCamera({ yaw: Number(b.dataset.view), pitch: 0 }));
    el<HTMLInputElement>('[data-yaw]').addEventListener('input', e => setCamera({ yaw: Number((e.target as HTMLInputElement).value) }));
    el<HTMLInputElement>('[data-pitch]').addEventListener('input', e => setCamera({ pitch: Number((e.target as HTMLInputElement).value) }));
    el<HTMLInputElement>('[data-file-guide]').addEventListener('change', async (e) => { const input = e.target as HTMLInputElement, file = input.files?.[0]; try {
        if (file)
            await importGuide(await file.text(), file.name);
    }
    catch (e) {
        status(String(e), true);
    } input.value = ''; });
    el<HTMLInputElement>('[data-file-project]').addEventListener('change', async (e) => { const input = e.target as HTMLInputElement, file = input.files?.[0]; try {
        if (file) {
            if (file.size > 64 * 1024 * 1024)
                throw new Error('Package too large');
            await importProject(await file.text());
        }
    }
    catch (e) {
        status(String(e), true);
    } input.value = ''; });
    let drag: {
        id:number; x:number; y:number; pose:DriverPose; camera:View3; bone:string;
        kind:'node'|'ring'|'orbit'; grab:NodeGrab; pivot:{x:number;y:number};
        angle:number; turn:number; moved:boolean; historyLength:number;
        rect:{left:number;top:number;width:number;height:number};
    } | null=null;
    const manipulateNode=(grab:NodeGrab,dx:number,dy:number)=>{
        const solved=solveNodeGrab(doc.driver,grab,dx,dy);
        setPose(solved.pose,false,{grab,dx,dy,target:solved.target,limited:solved.limited});
    };
    const pointerDown=(e:PointerEvent)=>{
        if (e.button!==0 || drag || !e.isPrimary) return;
        const r=canvas.getBoundingClientRect(),at={x:e.clientX-r.left,y:e.clientY-r.top};
        const world=evaluateDriver(doc.driver,doc.pose);
        let kind:'node'|'ring'|'orbit'='orbit', bone=doc.workspace.selectedBone;
        if (doc.workspace.interaction==='pose') {
            if (!doc.workspace.showDriver) {status('Enable Driver overlay for nodes/ring, or use the screen-direction buttons.');return;}
            const pivot=screen(world[bone].position),d=Math.hypot(at.x-pivot.x,at.y-pivot.y);
            const hit=pickNode(doc.driver,doc.pose,doc.workspace.camera,fit,at,bone);
            const near=hit?Math.hypot(at.x-screen(world[hit].position).x,at.y-screen(world[hit].position).y):Infinity;
            if (near<11) {bone=hit!;kind='node';}
            else if (Math.abs(d-RING_RADIUS)<8) kind='ring';
            else if (hit) {bone=hit;kind='node';}
            else return;
            commit(n=>n.workspace.selectedBone=bone);
        }
        const pivot=screen(world[bone].position);
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,pose:structuredClone(doc.pose),
            camera:{...doc.workspace.camera},bone,kind,
            grab:beginNodeGrab(doc.driver,doc.pose,bone,doc.workspace.camera,fit.scale),
            pivot:{x:r.left+pivot.x,y:r.top+pivot.y},
            angle:Math.atan2(e.clientY-r.top-pivot.y,e.clientX-r.left-pivot.x)*180/Math.PI,
            turn:0,moved:false,historyLength:history.length,
            rect:{left:r.left,top:r.top,width:r.width,height:r.height}};
        canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);e.preventDefault();
        targetMarker=null;requestDraw();
    };
    const pointerMove=(e:PointerEvent)=>{
        if (!drag || drag.id!==e.pointerId) return;
        const r=canvas.getBoundingClientRect();
        if (Math.abs(r.width-drag.rect.width)>.5 || Math.abs(r.height-drag.rect.height)>.5
            || Math.abs(r.left-drag.rect.left)>.5 || Math.abs(r.top-drag.rect.top)>.5) {
            cancelDrag();status('View layout changed; gesture cancelled to avoid a jump.',true);return;
        }
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if (!drag.moved && Math.hypot(dx,dy)<.5) return;
        if (!drag.moved) {remember();drag.moved=true;}
        if (drag.kind==='orbit') setCamera({yaw:drag.camera.yaw+dx*.6,pitch:drag.camera.pitch+dy*.35});
        else if (drag.kind==='node') manipulateNode(drag.grab,dx,dy);
        else {
            const a=Math.atan2(e.clientY-drag.pivot.y,e.clientX-drag.pivot.x)*180/Math.PI;
            drag.turn+=shortestDegrees(a-drag.angle);drag.angle=a;
            setPose(rotateInView(doc.driver,drag.pose,drag.bone,drag.camera,drag.turn),false);
        }
        e.preventDefault();
    };
    function cancelDrag() {
        if (!drag) return;
        const old=drag;drag=null;
        if (old.moved) {
            // This is the private, previously accepted start state, not unchecked external input.
            shape=bindSurfaces(evaluateDriver(doc.driver,old.pose),[...surface.surfaces.values()],surface.weldGroups);
            commit(n=>{n.pose=structuredClone(old.pose);n.workspace.camera={...old.camera};});
            lastManipulation=null;
            history.splice(old.historyLength);
            status('Gesture cancelled; original pose restored.');
        }
        if (canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id);
        targetMarker=null;requestDraw();
    }
    const pointerUp=(e:PointerEvent)=>{
        if (!drag || drag.id!==e.pointerId) return;
        pointerMove(e);
        if (!drag) return;
        const id=drag.id;drag=null;
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        requestDraw();
    };
    canvas.addEventListener('pointerdown',pointerDown);
    canvas.addEventListener('pointermove',pointerMove);
    canvas.addEventListener('pointerup',pointerUp);
    canvas.addEventListener('pointercancel',cancelDrag);
    canvas.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
    const nudge=(dx:number,dy:number)=>{
        if (drag) return;
        remember();
        const grab=beginNodeGrab(doc.driver,doc.pose,doc.workspace.selectedBone,doc.workspace.camera,fit.scale);
        manipulateNode(grab,dx,dy);
    };
    for (const b of host.querySelectorAll<HTMLButtonElement>('[data-nudge]'))
        b.addEventListener('click',()=>{const [dx,dy]=b.dataset.nudge!.split(',').map(Number);nudge(dx,dy);});
    canvas.addEventListener('keydown',(e:KeyboardEvent)=>{
        if(e.key==='Escape'){cancelDrag();e.preventDefault();return;}
        if (e.ctrlKey||e.altKey||e.metaKey||doc.workspace.interaction!=='pose') return;
        const d:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
        if(d[e.key]){const step=e.shiftKey?1:5;nudge(d[e.key][0]*step,d[e.key][1]*step);e.preventDefault();}
    });
    const resize = new ResizeObserver(requestDraw);
    resize.observe(cameraEl);
    const visibility = () => { if (document.visibilityState === 'hidden')
        save().catch(() => { }); };
    document.addEventListener('visibilitychange', visibility);
    function destroy() { alive = false; clearTimeout(timer); cancelAnimationFrame(raf); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); surface.destroy(); if (storageAvailable)
        store.save(doc).catch(() => { }).finally(() => store.close());
    else
        store.close(); host.replaceChildren(); }
    const api: DriverAPI = { getProject: () => structuredClone(doc), setAngle: (id, a, v) => setPose(withAngle(doc.pose, id, a, v)), setCamera, setOverlay: (show) => commit(n => n.workspace.showDriver = show), setLabelBasis, setDiagnostic: v => commit(n => n.workspace.diagnostic = v), setPose, importGuide, approveGuide: approve, exportProject, importProject, save, undo, metrics: () => ({ version: 'foundation-0.1.2', labelBasis: doc.workspace.labelBasis ?? 'screen', projectId: doc.id, revision: doc.revision, rigBones: doc.driver.bones.length, driverRevision: doc.driver.revision, pose: structuredClone(doc.pose), camera: { ...doc.workspace.camera }, coverage: artCoverage(doc.pose, doc.workspace.camera, doc.registration.status), shape: { minScale: shape.minScale, maxScale: shape.maxScale, seamGap: shape.seamGap, accepted: shape.accepted }, weights: surface.auditWeights(), guides: doc.guides.length, storageAvailable, drawMs, drawCount, lastManipulation, fit: {...fit},
        handles:doc.driver.bones.map(b=>{const world=evaluateDriver(doc.driver,doc.pose);return {
            ...jointPresentation(b.id,world,doc.workspace.camera,doc.workspace.labelBasis ?? 'screen'),label:jointPresentation(b.id,world,doc.workspace.camera,doc.workspace.labelBasis ?? 'screen').primary,...screen(world[b.id].position),
            screenSide:screenSide(b.id,world,doc.workspace.camera)}}),
        world: evaluateDriver(doc.driver, doc.pose) }), destroy, canvas };
    opts.signal?.addEventListener('abort', destroy, { once: true });
    syncControls();
    syncGuide();
    syncQueue();
    syncLibrary();
    requestDraw();
    return api;
}
