import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { idleGlance } from "@/lib/puppet/life";
import { sampleClip } from "@/lib/puppet/clips";
import { JOINTS, computeWorld } from "@/lib/puppet/mesh";
import { REPO_CLIPS, repoAt } from "@/lib/puppet/repo";
import { usePuppet } from "@/lib/puppet/store";
import type { BoneId } from "@/lib/puppet/types";
import { RIG_H, RIG_W, angDist, keysForClip, nearestFrom, stepYaw } from "@/lib/puppet/views";

function jnt(id: BoneId) {
  return JOINTS.find((j) => j.id === id)!;
}

export function LiveCharacter() {
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const yaw = usePuppet((s) => s.yaw);
  const setYaw = usePuppet((s) => s.setYaw);
  const clip = usePuppet((s) => s.clip);

  useEffect(() => {
    const stage = stageRef.current;
    const box = boxRef.current;
    if (!stage || !box) return;

    let playT = 0;
    let yawVel = 0;
    let mode: "none" | "orbit" | "joint" = "none";
    let dragBone: BoneId | null = null;
    let dragParent = 0;
    let dragOrigin = { x: 0, y: 0 };
    let orbitStartX = 0;
    let orbitStartYaw = 0;
    let running = true;

    const hitJoint = (px: number, py: number): BoneId | null => {
      const st = usePuppet.getState();
      if (!st.showJoints || st.clip === "hinge" || angDist(st.yaw, 0) > 22) return null;
      const r = box.getBoundingClientRect();
      const world = computeWorld(st.bones, r.width, r.height);
      let best: BoneId | null = null;
      let bestD = 26;
      for (const j of JOINTS) {
        if (j.id === "torso") continue;
        const p = world[j.id];
        const d = Math.hypot(r.left + p.x - px, r.top + p.y - py);
        if (d < bestD) {
          bestD = d;
          best = j.id;
        }
      }
      return best;
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      const st = usePuppet.getState();
      const hit = hitJoint(e.clientX, e.clientY);
      e.preventDefault();
      if (hit) {
        mode = "joint";
        dragBone = hit;
        const def = jnt(hit);
        dragParent = 0;
        let id = def.parent;
        while (id) {
          dragParent += st.bones[id];
          id = jnt(id).parent;
        }
        const r = box.getBoundingClientRect();
        dragOrigin = { x: r.left + def.x * r.width, y: r.top + def.y * r.height };
        stage.setPointerCapture(e.pointerId);
        st.playClip("live");
        yawVel = 0;
        return;
      }
      mode = "orbit";
      orbitStartX = e.clientX;
      orbitStartYaw = st.yaw;
      yawVel = 0;
      stage.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const st = usePuppet.getState();
      if (mode === "joint" && dragBone) {
        const ang = (Math.atan2(e.clientX - dragOrigin.x, e.clientY - dragOrigin.y) * 180) / Math.PI - dragParent;
        st.setBone(dragBone, ang);
        return;
      }
      if (mode === "orbit") {
        st.setYaw(orbitStartYaw - (e.clientX - orbitStartX) * 0.85);
        yawVel = -e.movementX * 0.85;
      }
    };

    const onUp = () => {
      if (mode === "orbit") {
        const st = usePuppet.getState();
        st.setYaw(nearestFrom(keysForClip(st.clip), st.yaw).yaw);
      }
      mode = "none";
      dragBone = null;
      yawVel = 0;
    };

    stage.addEventListener("pointerdown", onDown, { passive: false });
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);

    let last = performance.now();
    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      playT += dt;
      const st = usePuppet.getState();
      const sampled = st.playing && mode !== "joint" ? sampleClip(st.clip, playT) : null;
      if (sampled) {
        usePuppet.setState({ bones: sampled.joints, blink: sampled.eyes.open, target: null });
      } else {
        st.tickTween(dt);
      }
      if (mode !== "orbit" && Math.abs(yawVel) > 0.08) {
        st.setYaw(st.yaw + yawVel);
        yawVel *= 0.9;
      } else if (mode !== "orbit") {
        yawVel = 0;
      }

      let viewYaw = st.yaw;
      if (sampled?.gaze != null && mode !== "orbit" && angDist(st.yaw, 0) < 12) {
        viewYaw = sampled.gaze;
      } else if (st.clip === "live" && mode !== "orbit" && angDist(st.yaw, 0) < 12) {
        viewYaw = idleGlance(playT) ?? 0;
      }
      const film = sampled ? undefined : REPO_CLIPS.find((c) => c.id === st.clip);
      const next = nearestFrom(keysForClip(st.clip === "live" ? "idle" : st.clip), viewYaw);
      if (film) {
        const src = repoAt(film.dir, playT);
        if (imgRef.current) {
          if (imgRef.current.dataset.src !== src) {
            imgRef.current.src = src;
            imgRef.current.dataset.src = src;
          }
          imgRef.current.style.transform = "none";
          imgRef.current.style.opacity = "1";
        }
        if (labelRef.current) labelRef.current.textContent = `${film.label} · 12fps`;
      } else if (imgRef.current) {
        if (imgRef.current.dataset.src !== next.src) {
          imgRef.current.src = next.src;
          imgRef.current.dataset.src = next.src;
        }
        imgRef.current.style.transform = next.flip ? "scaleX(-1)" : "none";
        imgRef.current.style.opacity = "1";
        if (labelRef.current) {
          labelRef.current.textContent = `${next.label} · ${st.clip === "live" ? "drive" : st.clip}`;
        }
      }

      const svg = svgRef.current;
      const wr = box.clientWidth;
      const hr = box.clientHeight;
      const front = !film && st.showJoints && st.clip !== "hinge" && angDist(viewYaw, 0) < 22 && !next.flip;
      if (svg) {
        svg.style.display = front && wr > 0 ? "block" : "none";
        if (front && wr > 0) {
          const world = computeWorld(st.bones, wr, hr);
          for (const j of JOINTS) {
            if (!j.parent) continue;
            const line = svg.querySelector(`[data-bone="${j.id}"]`) as SVGLineElement | null;
            if (line) {
              const a = world[j.parent];
              const b = world[j.id];
              line.setAttribute("x1", String(a.x));
              line.setAttribute("y1", String(a.y));
              line.setAttribute("x2", String(b.x));
              line.setAttribute("y2", String(b.y));
            }
          }
          for (const j of JOINTS) {
            if (j.id === "torso") continue;
            const dot = svg.querySelector(`[data-joint="${j.id}"]`) as SVGCircleElement | null;
            if (dot) {
              const p = world[j.id];
              dot.setAttribute("cx", String(p.x));
              dot.setAttribute("cy", String(p.y));
            }
          }
        }
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      running = false;
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative flex h-full min-h-0 w-full touch-none items-end justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <button
        type="button"
        aria-label="Turn left"
        className="bg-raised text-fg absolute top-1/2 left-2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full shadow-border"
        onClick={() => setYaw(stepYaw(yaw, -1, clip))}
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Turn right"
        className="bg-raised text-fg absolute top-1/2 right-2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full shadow-border"
        onClick={() => setYaw(stepYaw(yaw, 1, clip))}
      >
        <ChevronRight className="size-6" />
      </button>
      <div
        ref={boxRef}
        className="relative h-full max-h-full w-auto max-w-full min-h-0 touch-none"
        style={{ aspectRatio: `${RIG_W} / ${RIG_H}` }}
      >
        <span className="foot-shadow" />
        <img
          ref={imgRef}
          src="/puppet/rig/front.png?v=6"
          alt="Shadowveil"
          draggable={false}
          className="pointer-events-none relative z-0 block h-full w-auto max-h-full max-w-full object-contain object-bottom select-none"
        />
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          {JOINTS.filter((j) => j.parent).map((j) => (
            <line key={`b-${j.id}`} data-bone={j.id} stroke="rgba(232,226,214,0.45)" strokeWidth="2" />
          ))}
          {JOINTS.filter((j) => j.id !== "torso").map((j) => (
            <circle
              key={j.id}
              data-joint={j.id}
              r={j.id === "hinge" ? 8 : 6}
              fill={j.id === "hinge" ? "#d4a017" : "#d45c5c"}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <p
        ref={labelRef}
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 font-mono text-xs tracking-[0.22em] text-subtle uppercase"
      >
        Front · idle
      </p>
    </div>
  );
}
