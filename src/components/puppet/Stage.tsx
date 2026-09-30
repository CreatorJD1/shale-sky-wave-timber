import { LiveCharacter } from "@/components/puppet/LiveCharacter";
import { usePuppet } from "@/lib/puppet/store";
import { expressionSrc } from "@/lib/puppet/views";
import { cn } from "@/lib/utils";

export function Stage() {
  const emotion = usePuppet((s) => s.emotion);
  const blink = usePuppet((s) => s.blink);
  const meshGlow = usePuppet((s) => s.meshGlow);
  const faceSrc = expressionSrc(emotion, false, blink);

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
