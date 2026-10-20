import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import type { LevelSource } from "#/components/interview/call-types";

// How fast the drawn level follows the voice: quick to rise, slow to fall,
// so it pulses with syllables instead of flickering.
const ATTACK = 0.35;
const RELEASE = 0.1;

// A glowing orb that swells with the agent's voice. The level is written to
// CSS variables once a frame, so it animates without re-rendering React.
//   --level   0..1, drives brightness and glow
//   --motion  0..1, drives size; zero when the user prefers reduced motion
export function AgentOrb({ getLevel }: { getLevel: LevelSource }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let level = 0;
    let frame = 0;

    const tick = (time: number) => {
      const target = Math.min(1, Math.max(0, getLevel(time)));
      level += (target - level) * (target > level ? ATTACK : RELEASE);

      ref.current?.style.setProperty("--level", level.toFixed(3));
      ref.current?.style.setProperty(
        "--motion",
        reduceMotion ? "0" : level.toFixed(3),
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative grid size-56 place-items-center sm:size-72"
      style={{ "--level": 0, "--motion": 0 } as CSSProperties}
    >
      {/* Halo: the soft light around the orb, brightest when speaking. */}
      <div
        className="absolute -inset-1/3 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--chart-2) 0%, transparent 65%)",
          opacity: "calc(0.25 + var(--level) * 0.6)",
          transform: "scale(calc(0.85 + var(--motion) * 0.45))",
        }}
      />

      {/* Two rings that ripple outward on louder moments. */}
      <div
        className="absolute inset-[8%] rounded-full border border-primary"
        style={{
          opacity: "calc(var(--level) * 0.7)",
          transform: "scale(calc(1 + var(--motion) * 0.22))",
        }}
      />
      <div
        className="absolute inset-[8%] rounded-full border border-primary/60"
        style={{
          opacity: "calc(var(--level) * 0.4)",
          transform: "scale(calc(1.05 + var(--motion) * 0.42))",
        }}
      />

      {/* Core: a lit sphere, highlight up and to the left. */}
      <div
        className="relative size-[64%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 34% 30%, oklch(0.97 0.03 85) 0%, var(--chart-2) 38%, var(--chart-5) 72%, oklch(0.3 0.06 50) 100%)",
          boxShadow:
            "0 0 calc(24px + var(--level) * 72px) calc(var(--level) * 12px) var(--chart-2), inset 0 -12px 32px oklch(0 0 0 / 0.35)",
          filter: "brightness(calc(0.8 + var(--level) * 0.35))",
          transform: "scale(calc(1 + var(--motion) * 0.1))",
        }}
      />
    </div>
  );
}
