import { useEffect, useRef, useState } from "react";
import { LiveCharacter } from "@/components/puppet/LiveCharacter";
import { usePuppet } from "@/lib/puppet/store";
import { EMOTIONS } from "@/lib/puppet/types";
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

export function Stage() {
  const emotion = usePuppet((s) => s.emotion);
  const meshGlow = usePuppet((s) => s.meshGlow);
  const [blinkClosed, setBlinkClosed] = useState(false);
  const blinkT = useRef(2.8);
  const blinkPhase = useRef(0);

  useRaf((dt) => {
    blinkT.current -= dt;
    if (blinkPhase.current > 0) {
      blinkPhase.current += dt * 12;
      if (blinkPhase.current >= 1) {
        blinkPhase.current = 0;
        setBlinkClosed(false);
      } else {
        setBlinkClosed(blinkPhase.current > 0.18 && blinkPhase.current < 0.62);
      }
    } else if (blinkT.current <= 0) {
      blinkPhase.current = 0.01;
      blinkT.current = 2.8 + Math.random() * 3.6;
    }
  });

  const emotionSrc = EMOTIONS.find((e) => e.id === emotion)?.src ?? "/puppet/emotions/neutral.png";
  const faceSrc = blinkClosed ? "/puppet/blink/closed.png" : emotionSrc;

  return (
    <div className="stage-vignette relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent" />

      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 sm:top-4 sm:left-4">
        <FaceCam src={faceSrc} glow={meshGlow} />
        <div className="hidden sm:block">
          <p className="font-display text-lg leading-tight text-fg">Shadowveil</p>
          <p className="text-xs tracking-wide text-muted">Drag to turn</p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <LiveCharacter />
      </div>
    </div>
  );
}

function FaceCam({ src, glow }: { src: string; glow: boolean }) {
  return (
    <div
      className={cn(
        "size-16 overflow-hidden rounded-lg bg-raised shadow-border sm:size-24",
        glow && "ring-1 ring-amber/35",
      )}
    >
      <img src={src} alt="" className="size-full object-cover object-top" draggable={false} />
    </div>
  );
}
