import { RotateCcw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stage } from "@/components/puppet/Stage";
import { ART_MANIFEST, artCounts } from "@/lib/puppet/art-manifest";
import { CANON, LOCK_RULES, SIM_BUDGET } from "@/lib/puppet/style-lock";
import { REPO_CLIPS } from "@/lib/puppet/repo";
import { usePuppet } from "@/lib/puppet/store";
import type { EmotionId } from "@/lib/puppet/types";
import { FACE_OK } from "@/lib/puppet/views";
import { VIEW_KEYS } from "@/lib/puppet/views";
import { cn } from "@/lib/utils";

export function Studio() {
  const showCanon = usePuppet((s) => s.showCanon);
  return (
    <div className="bg-bg text-fg flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header />
      <main className="relative min-h-0 flex-1">
        <Stage />
      </main>
      <Dock />
      {showCanon ? <CanonSheet /> : null}
    </div>
  );
}

function Header() {
  const reset = usePuppet((s) => s.reset);
  const setShowCanon = usePuppet((s) => s.setShowCanon);
  return (
    <header className="border-border bg-surface flex shrink-0 items-center gap-3 border-b px-4 py-2">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl leading-none tracking-tight sm:text-2xl">Shadowveil</h1>
        <p className="mt-1 truncate text-xs text-muted">
          {CANON.ageYears} · {CANON.height} · drag to turn
        </p>
      </div>
      <Button variant="ghost" size="icon" aria-label="Canon lock" className="size-11" onClick={() => setShowCanon(true)}>
        <Shield className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Reset" className="size-11" onClick={reset}>
        <RotateCcw className="size-4" />
      </Button>
    </header>
  );
}

function Dock() {
  const emotion = usePuppet((s) => s.emotion);
  const setEmotion = usePuppet((s) => s.setEmotion);
  const playClip = usePuppet((s) => s.playClip);
  const clip = usePuppet((s) => s.clip);
  const yaw = usePuppet((s) => s.yaw);
  const setYaw = usePuppet((s) => s.setYaw);
  const reset = usePuppet((s) => s.reset);
  const thumbs = VIEW_KEYS.filter((k) => !k.flip && [0, 45, 90, 180].includes(k.yaw));

  return (
    <div className="border-border bg-surface shrink-0 border-t px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="flex gap-2 overflow-x-auto">
        {thumbs.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => {
              playClip("live");
              setYaw(k.yaw);
            }}
            className={cn(
              "h-16 w-10 shrink-0 overflow-hidden rounded-md bg-bg",
              clip !== "hinge" && Math.abs(yaw - k.yaw) < 20 && "ring-2 ring-amber",
            )}
            aria-label={k.label}
          >
            <img src={k.src} alt="" className="size-full object-contain object-bottom" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => playClip("hinge")}
          className={cn("h-16 w-10 shrink-0 overflow-hidden rounded-md bg-bg", clip === "hinge" && "ring-2 ring-amber")}
          aria-label="Hinge"
        >
          <img src="/puppet/rig/hinge.png?v=6" alt="" className="size-full object-contain object-bottom" />
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {FACE_OK.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEmotion(e.id as EmotionId)}
            className={cn(
              "size-11 shrink-0 overflow-hidden rounded-full shadow-border",
              emotion === e.id && "ring-2 ring-amber",
            )}
            aria-label={e.id}
          >
            <img src={e.src} alt="" className="size-full object-cover object-top" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => playClip("live")}
          className={cn(
            "min-h-11 shrink-0 rounded-md px-3 text-xs tracking-wide uppercase",
            clip === "live" ? "bg-raised text-fg shadow-border" : "text-muted",
          )}
        >
          Drive
        </button>
        {REPO_CLIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => playClip(c.id as typeof clip)}
            className={cn(
              "min-h-11 shrink-0 rounded-md px-3 text-xs tracking-wide uppercase",
              clip === c.id ? "bg-raised text-fg shadow-border" : "text-muted",
            )}
          >
            {c.label}
          </button>
        ))}
        <button type="button" onClick={reset} className="text-muted min-h-11 shrink-0 px-3 text-xs tracking-wide uppercase">
          Reset
        </button>
      </div>
    </div>
  );
}

function CanonSheet() {
  const setShowCanon = usePuppet((s) => s.setShowCanon);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="bg-surface max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg p-5 shadow-border">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Canon lock</h2>
          <Button onClick={() => setShowCanon(false)}>Close</Button>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {LOCK_RULES.map((r) => (
            <li key={r.id}>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-muted text-sm">{r.body}</p>
            </li>
          ))}
        </ul>
        <h3 className="font-display mt-6 text-xl">Sprite list</h3>
        <p className="text-muted mt-1 text-sm">
          {artCounts().have} locked · {artCounts().gen} new this pass · {artCounts().todo} remaining · {artCounts().total} unique (+
          {artCounts().flips} orbit flips)
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 font-mono text-xs">
          {ART_MANIFEST.map((a) => (
            <li key={a.id} className="flex gap-2">
              <span className={a.status === "have" ? "text-green" : a.status === "gen" ? "text-amber" : "text-subtle"}>
                {a.status}
              </span>
              <span className="text-fg">
                {a.pose} {a.view}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted mt-2 text-sm">{SIM_BUDGET.formula}</p>
        <p className="text-muted mt-2 text-sm">{SIM_BUDGET.live2dNote}</p>
        <p className="mt-3 text-sm font-medium">On deck</p>
        <ul className="text-muted mt-1 flex flex-col gap-1 text-sm">
          {SIM_BUDGET.nextTier.map((n) => (
            <li key={n.need}>
              {n.need} — {n.count} drawings
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
