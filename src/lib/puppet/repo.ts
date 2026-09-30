/** 100-image action repository. 8 clips × 12 frames @ 12fps + 4 extras. */

export const REPO_FPS = 12;
export const REPO_FRAMES = 12;

export interface RepoClip {
  id: string;
  label: string;
  dir: string;
  loop: boolean;
}

export const REPO_CLIPS: RepoClip[] = [
  { id: "look", label: "Turn", dir: "stand", loop: true },
  { id: "idle", label: "Idle", dir: "idle", loop: true },
  { id: "hinge", label: "Hinge", dir: "hinge", loop: true },
  { id: "wave", label: "Wave", dir: "wave", loop: true },
  { id: "walk", label: "Walk", dir: "walk", loop: true },
  { id: "crouch", label: "Crouch", dir: "crouch", loop: true },
  { id: "reach", label: "Reach", dir: "reach", loop: true },
];

export function repoFrame(dir: string, i: number) {
  const n = ((i % REPO_FRAMES) + REPO_FRAMES) % REPO_FRAMES;
  return `/puppet/repo/${dir}/${String(n).padStart(2, "0")}.png`;
}

export function repoAt(dir: string, t: number) {
  return repoFrame(dir, Math.floor(t * REPO_FPS));
}
