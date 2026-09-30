import { create } from "zustand";
import { BONE_DEFS, IDLE_BONES, type Bones, type BoneId, type ClipId, type EmotionId } from "./types";
import { CLIP_KEYS, lerpBones, POSES } from "./clips";

const SAVE_KEY = "shadowveil.poses.v1";

export interface SavedPose {
  id: string;
  name: string;
  bones: Bones;
  emotion: EmotionId;
}

interface PuppetState {
  bones: Bones;
  target: Bones | null;
  emotion: EmotionId;
  clip: ClipId;
  playing: boolean;
  speed: number;
  showJoints: boolean;
  meshGlow: boolean;
  showCanon: boolean;
  yaw: number;
  blink: number;
  breath: number;
  saved: SavedPose[];
  setBone: (id: BoneId, value: number) => void;
  setEmotion: (id: EmotionId) => void;
  playClip: (id: ClipId) => void;
  stop: () => void;
  applyPose: (bones: Bones, tween?: boolean) => void;
  reset: () => void;
  setSpeed: (n: number) => void;
  setShowJoints: (v: boolean) => void;
  setMeshGlow: (v: boolean) => void;
  setShowCanon: (v: boolean) => void;
  setYaw: (n: number) => void;
  setBlink: (n: number) => void;
  setBreath: (n: number) => void;
  tickTween: (dt: number) => void;
  saveCurrent: (name: string) => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
}

function loadSaved(): SavedPose[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPose[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(saved: SavedPose[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    /* ignore quota */
  }
}

function clampBone(id: BoneId, value: number) {
  const def = BONE_DEFS.find((d) => d.id === id);
  if (!def) return value;
  return Math.max(def.min, Math.min(def.max, value));
}

export const usePuppet = create<PuppetState>((set, get) => ({
  bones: { ...IDLE_BONES },
  target: null,
  emotion: "neutral",
  clip: "idle",
  playing: true,
  speed: 1,
  showJoints: true,
  meshGlow: true,
  showCanon: false,
  yaw: 0,
  blink: 1,
  breath: 0,
  saved: loadSaved(),
  setBone: (id, value) =>
    set((s) => ({
      bones: { ...s.bones, [id]: clampBone(id, value) },
      target: null,
      clip: "live",
    })),
  setEmotion: (id) => set({ emotion: id }),
  playClip: (id) => {
    set({
      clip: id,
      playing: true,
      target: CLIP_KEYS[id] ? null : POSES[id] ? { ...POSES[id] } : null,
    });
  },
  stop: () => set({ playing: false, clip: "live", target: null }),
  applyPose: (bones, tween = true) =>
    set(tween ? { target: { ...bones }, clip: "live" } : { bones: { ...bones }, target: null }),
  reset: () => set({ bones: { ...IDLE_BONES }, target: null, clip: "idle", playing: true, emotion: "neutral", yaw: 0 }),
  setSpeed: (n) => set({ speed: n }),
  setShowJoints: (v) => set({ showJoints: v }),
  setMeshGlow: (v) => set({ meshGlow: v }),
  setShowCanon: (v) => set({ showCanon: v }),
  setYaw: (n) => set({ yaw: ((n % 360) + 360) % 360 }),
  setBlink: (n) => set({ blink: n }),
  setBreath: (n) => set({ breath: n }),
  tickTween: (dt) => {
    const { target, bones } = get();
    if (!target) return;
    const next = lerpBones(bones, target, Math.min(1, dt * 6));
    let done = true;
    for (const k of Object.keys(target) as BoneId[]) {
      if (Math.abs(next[k] - target[k]) > 0.4) done = false;
    }
    set({ bones: done ? target : next, target: done ? null : target });
  },
  saveCurrent: (name) => {
    const { bones, emotion, saved } = get();
    const entry: SavedPose = {
      id: `${Date.now()}`,
      name: name.trim() || "Pose",
      bones: { ...bones },
      emotion,
    };
    const next = [entry, ...saved].slice(0, 24);
    persist(next);
    set({ saved: next });
  },
  loadSaved: (id) => {
    const found = get().saved.find((p) => p.id === id);
    if (!found) return;
    set({ target: { ...found.bones }, emotion: found.emotion, clip: "live" });
  },
  deleteSaved: (id) => {
    const next = get().saved.filter((p) => p.id !== id);
    persist(next);
    set({ saved: next });
  },
}));
