/** Presentation-only labels. Never write to bone IDs, transforms, weights or input axes. */
import { anatomicalSide, nodeLabel, screenSide } from './controls.js';
import { project3 } from './math3.js';
export function validLabelBasis(value) {
    return value === 'screen' || value === 'anatomical';
}
/** Screen side is relative to the projected pelvis, not the window midpoint.
 * A crossed hand can change screen side without changing its anatomical identity.
 * Coincident left/right joints (e.g. a profile view) have no meaningful screen-side label.
 */
export function jointPresentation(id, world, camera, basis = 'screen') {
    if (!world[id] || !world.pelvis)
        throw Error('Unknown label node: ' + id);
    if (!validLabelBasis(basis))
        throw Error('Invalid label basis');
    const side = anatomicalSide(id);
    const name = nodeLabel(id).replace(/^Her (left|right) · /, '');
    const anatomical = side === 'midline' ? `Midline · ${name}` : `Character ${side} · ${name}`;
    let location = 'midline';
    if (side !== 'midline') {
        const other = id.replace(/-[RL]$/, side === 'left' ? '-R' : '-L');
        const p = project3(world[id].position, camera);
        const q = world[other] ? project3(world[other].position, camera) : null;
        const loc = screenSide(id, world, camera);
        location = q && Math.hypot(p.x - q.x, p.y - q.y) < 2 ? 'overlap'
            : loc === 'screen-left' ? 'left' : loc === 'screen-right' ? 'right' : 'centre';
    }
    const primary = basis === 'anatomical' ? (side === 'midline' ? name : anatomical)
        : location === 'midline' ? name : `Screen ${location} · ${name}`;
    const marker = basis === 'anatomical' ? (side === 'left' ? 'Char L' : side === 'right' ? 'Char R' : '')
        : ({ left: 'Screen L', right: 'Screen R', centre: 'Centre', overlap: 'Overlap', midline: '' })[location];
    return { id, primary, anatomical, detail: `${anatomical} · ID: ${id}`, marker, location };
}
