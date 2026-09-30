import { type WorldRig } from './driver.js';
import { type View3 } from './math3.js';
export type LabelBasis = 'screen' | 'anatomical';
export interface JointPresentation {
    id: string;
    primary: string;
    anatomical: string;
    detail: string;
    marker: string;
    location: 'left' | 'right' | 'centre' | 'overlap' | 'midline';
}
export declare function validLabelBasis(value: unknown): value is LabelBasis;
/** Screen side is relative to the projected pelvis, not the window midpoint.
 * A crossed hand can change screen side without changing its anatomical identity.
 * Coincident left/right joints (e.g. a profile view) have no meaningful screen-side label.
 */
export declare function jointPresentation(id: string, world: WorldRig, camera: View3, basis?: LabelBasis): JointPresentation;
