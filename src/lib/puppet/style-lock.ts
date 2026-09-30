/** Canon lock — source of truth for Shadowveil. Do not drift. */

export const CANON = {
  name: "Shadowveil",
  ageYears: 27,
  height: "5′10″",
  heightCm: 178,
  body: "Adult, long-legged, ~8-head fashion proportion. Athletic and lean, not bulky, not chibi.",
  style:
    "Stylized ink outlines with watercolor wash. Source sheets only — not pixel art, not photoreal, not anime-chibi, not a costume swap.",
} as const;

/** Viewer-relative. Front view, she faces camera. */
export const FACE_LOCK = {
  widowPeak: "V-shaped widow’s peak, always visible",
  hair: "Black hair, messy high bun, loose tendrils at the temples",
  skin: "Olive-tan / warm medium",
  eyeLeftOfImage: { color: "amber-gold", hex: "#d4a017" },
  eyeRightOfImage: { color: "green", hex: "#3d9b55" },
  beautyMark: "Small mark on the viewer’s-right cheek",
  lips: "Full, dark",
} as const;

export const SUIT_LOCK = {
  material: "Tactical woven fiber, second-skin, charcoal black",
  shoulders: "Cold-shoulder cutouts — no shoulder plates",
  mesh: "Bronze-gold stretch mesh on chest and back; expands at the midriff hinge, never tears",
  tracings: "Luminescent green and gold circuit lines",
  armor: "Light paneling at thigh and calf only",
  feet: "Toe-sheath shoes, ~3in heel, open heel, flexible keel, no boot shafts, second-skin soles",
} as const;

export const HINGE_LOCK = {
  seat: "Between chest and navel — the species pivot, not a human lumbar bend",
  rule: "She is not meant to stand ramrod-straight after a full hinge",
  mesh: "Graphite/bronze mesh stretches as the fold deepens",
  legs: "Legs stay planted; upper body folds forward; arms hang with gravity at full fold",
  rangeDeg: { min: -12, max: 96 },
} as const;

export const LOCK_RULES: { id: string; title: string; body: string }[] = [
  {
    id: "identity",
    title: "Identity",
    body: "27 years old. 5′10″. Same woman in every view — widow’s peak, high bun, olive-tan skin.",
  },
  {
    id: "eyes",
    title: "Heterochromia",
    body: "Viewer’s left eye amber-gold. Viewer’s right eye green. Never swapped, never matching.",
  },
  {
    id: "mark",
    title: "Mark",
    body: "Beauty mark stays on the viewer’s-right cheek. Full dark lips.",
  },
  {
    id: "suit",
    title: "Suit",
    body: "Charcoal cold-shoulder catsuit. Bronze chest mesh. Green/gold tracings. No shoulder plates.",
  },
  {
    id: "feet",
    title: "Feet",
    body: "Toe-sheaths, open 3in heel, no boot shafts. Second-skin soles.",
  },
  {
    id: "hinge",
    title: "Hinge",
    body: "Midriff pivot between chest and navel. Mesh stretches. Full fold does not return her to a drill-sergeant stance. Hinge has its own turntable (front / 3/4 / side / back).",
  },
  {
    id: "anatomy",
    title: "Anatomy",
    body: "Eight-head fashion proportion at 5′10″. Long legs, defined waist, hinge under the ribcage — never through the hips or neck. Heels plant. Never squash or stretch the silhouette to fake motion. Face is never composited over an existing head.",
  },
  {
    id: "style",
    title: "Style",
    body: "Ink + watercolor wash from the source sheets. No pixel art, no photoreal, no leather-only catsuit, no redesign. Off-model gens are discarded, never wired.",
  },
];

export const SIM_BUDGET = {
  uniqueViews: 5,
  flippedViews: 3,
  yawTotal: 8,
  posesPlayable: ["A-pose / idle", "Hinge fold", "Wave (front)", "Expressions (front cam)"],
  drawingsNow: 9,
  nextTier: [
    { need: "Wave at 3/4 + side", count: 2 },
    { need: "Idle breath 2 inbetweens × 5 views", count: 10 },
    { need: "Face plates (8 moods × front + 3/4)", count: 16 },
    { need: "Blink 2 frames on front + 3/4", count: 4 },
  ],
  formula:
    "drawings = unique_views × poses + face_plates. 8-way orbit uses 5 unique drawings (left is a flip). A full 2D sim that can turn, fold, emote, and breathe is about 5 views × 6 poses + 16 faces ≈ 46 drawings — not a 3D mesh.",
  live2dNote:
    "Joint posing (drag a shoulder) cannot be faked with more sprites. That needs one front drawing skinned to bones. Sprites buy rotation and posed snapshots; a mesh buys in-between bends.",
} as const;

export const PROMPT_LOCK = [
  "CANON LOCK — do not redesign.",
  "27-year-old woman, 5 feet 10 inches tall, long-legged adult proportions (about eight heads).",
  "Stylized ink outlines with watercolor wash matching the source character sheets.",
  "Olive-tan skin. Black messy high bun, widow’s peak V always visible, loose face tendrils.",
  "The eye on the left of the image is amber-gold; the eye on the right of the image is green.",
  "Small beauty mark on the viewer’s-right cheek. Full dark lips.",
  "Charcoal cold-shoulder tactical catsuit, bronze-gold stretch mesh on the chest,",
  "green and gold circuit tracings, no shoulder plates,",
  "heeled toe-sheath shoes with open heels and no boot shafts.",
  "Not pixel art, not photoreal, not chibi, not a different person or costume.",
].join(" ");
