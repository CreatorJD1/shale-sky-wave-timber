import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePuppet } from "@/lib/puppet/store";
import type { BoneId } from "@/lib/puppet/types";
import { cn } from "@/lib/utils";

function useRaf(cb: (dt: number) => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      cbRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export function Rig() {
  const bones = usePuppet((s) => s.bones);
  const clip = usePuppet((s) => s.clip);
  const wrapRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);

  useRaf((dt) => {
    const live = clip === "live" || clip === "idle";
    if (!figureRef.current) return;
    if (!live) {
      figureRef.current.style.transform = "";
      return;
    }
    const s = (figureRef.current.dataset.t = String(Number(figureRef.current.dataset.t || "0") + dt));
    const t = Number(s);
    figureRef.current.style.transform = `translate(${Math.sin(t * 0.8) * 3}px, ${Math.sin(t * 1.55) * 2}px) rotate(${Math.sin(t * 0.9) * 0.7}deg)`;
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--rig-scale", String(Math.max(0.38, Math.min(r.height / 560, r.width / 260) * 0.98)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const b = bones;

  return (
    <div ref={wrapRef} className="relative flex h-full w-full items-end justify-center">
      <div className="origin-bottom" style={{ transform: "scale(var(--rig-scale, 1))", transformOrigin: "50% 100%" }}>
        <div ref={figureRef} className="relative origin-bottom" style={{ width: 260, height: 560 }}>
          <Limb
            bone="torso"
            parentWorld={0}
            className="absolute top-[248px] left-1/2 ml-[-48px] h-20 w-24"
            origin="50% 35%"
            angle={b.torso}
          >
            <Sprite src="/puppet/parts/pelvis.png" />

            <Limb
              bone="lHip"
              parentWorld={b.torso}
              className="absolute top-[52px] left-[6px] h-[120px] w-9"
              origin="50% 0%"
              angle={b.lHip}
            >
              <Sprite src="/puppet/parts/leg-l-thigh.png" />
              <Limb
                bone="lKnee"
                parentWorld={b.torso + b.lHip}
                className="absolute top-full left-1/2 ml-[-16px] h-[132px] w-8"
                origin="50% 0%"
                angle={b.lKnee}
              >
                <Sprite src="/puppet/parts/leg-l-calf.png" />
              </Limb>
            </Limb>

            <Limb
              bone="rHip"
              parentWorld={b.torso}
              className="absolute top-[52px] right-[6px] h-[120px] w-9"
              origin="50% 0%"
              angle={b.rHip}
            >
              <Sprite src="/puppet/parts/leg-r-thigh.png" />
              <Limb
                bone="rKnee"
                parentWorld={b.torso + b.rHip}
                className="absolute top-full left-1/2 ml-[-16px] h-[132px] w-8"
                origin="50% 0%"
                angle={b.rKnee}
              >
                <Sprite src="/puppet/parts/leg-r-calf.png" />
              </Limb>
            </Limb>

            <Limb
              bone="hinge"
              parentWorld={b.torso}
              className="absolute bottom-full left-1/2 ml-[-58px] h-[136px] w-[116px]"
              origin="50% 100%"
              angle={b.hinge}
              handle="amber"
            >
              <Sprite src="/puppet/parts/torso.png" fit="bottom" />

              <Limb
                bone="lShoulder"
                parentWorld={b.torso + b.hinge}
                className="absolute top-[22px] left-[-4px] h-[92px] w-8"
                origin="50% 0%"
                angle={b.lShoulder}
              >
                <Sprite src="/puppet/parts/arm-l-upper.png" />
                <Limb
                  bone="lElbow"
                  parentWorld={b.torso + b.hinge + b.lShoulder}
                  className="absolute top-full left-1/2 ml-[-14px] h-[88px] w-7"
                  origin="50% 0%"
                  angle={b.lElbow}
                >
                  <Sprite src="/puppet/parts/arm-l-fore.png" />
                </Limb>
              </Limb>

              <Limb
                bone="rShoulder"
                parentWorld={b.torso + b.hinge}
                className="absolute top-[22px] right-[-4px] h-[92px] w-8"
                origin="50% 0%"
                angle={b.rShoulder}
              >
                <Sprite src="/puppet/parts/arm-r-upper.png" />
                <Limb
                  bone="rElbow"
                  parentWorld={b.torso + b.hinge + b.rShoulder}
                  className="absolute top-full left-1/2 ml-[-14px] h-[88px] w-7"
                  origin="50% 0%"
                  angle={b.rElbow}
                >
                  <Sprite src="/puppet/parts/arm-r-fore.png" />
                </Limb>
              </Limb>

              <Limb
                bone="neck"
                parentWorld={b.torso + b.hinge}
                className="absolute bottom-full left-1/2 ml-[-40px] h-[108px] w-20"
                origin="50% 100%"
                angle={b.neck}
              >
                <Limb
                  bone="head"
                  parentWorld={b.torso + b.hinge + b.neck}
                  className="absolute inset-0"
                  origin="50% 88%"
                  angle={b.head}
                >
                  <Sprite src="/puppet/parts/head.png" fit="bottom" />
                </Limb>
              </Limb>
            </Limb>
          </Limb>
        </div>
      </div>
    </div>
  );
}

function Sprite({ src, fit = "top" }: { src: string; fit?: "top" | "bottom" }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full object-contain",
        fit === "bottom" ? "object-bottom" : "object-top",
      )}
    />
  );
}

function Limb({
  bone,
  parentWorld,
  className,
  origin,
  angle,
  handle = "joint",
  children,
}: {
  bone: BoneId;
  parentWorld: number;
  className?: string;
  origin: string;
  angle: number;
  handle?: "joint" | "amber";
  children: ReactNode;
}) {
  return (
    <div className={cn("absolute", className)} style={{ transform: `rotate(${angle}deg)`, transformOrigin: origin }}>
      {children}
      <Handle bone={bone} parentWorld={parentWorld} color={handle} origin={origin} />
    </div>
  );
}

function Handle({
  bone,
  parentWorld,
  color,
  origin,
}: {
  bone: BoneId;
  parentWorld: number;
  color: "joint" | "amber";
  origin: string;
}) {
  const show = usePuppet((s) => s.showJoints);
  const setBone = usePuppet((s) => s.setBone);
  if (!show) return null;
  const [ox, oy] = origin.split(" ");

  function down(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    const btn = e.currentTarget;
    btn.setPointerCapture(e.pointerId);
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const move = (ev: PointerEvent) => {
      const ang = (Math.atan2(ev.clientX - cx, ev.clientY - cy) * 180) / Math.PI - parentWorld;
      setBone(bone, ang);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <button
      type="button"
      aria-label={`Drag ${bone}`}
      onPointerDown={down}
      className="absolute z-30 size-11 -translate-x-1/2 -translate-y-1/2 touch-none"
      style={{ left: ox, top: oy }}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-border",
          color === "amber" ? "bg-hinge" : "bg-joint",
        )}
      />
    </button>
  );
}
