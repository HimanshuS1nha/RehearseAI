import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

// Bar heights relative to the level, so the meter reads as a little
// waveform rather than one block.
const BAR_WEIGHTS = [0.55, 0.85, 1, 0.75, 0.5];

// A live microphone level. It shows the voice is reaching the page even
// when speech recognition hears no words, which tells a muted or wrong mic
// apart from a recognition problem. Reads its own stream; the level is
// written to a CSS variable each frame, so it doesn't re-render React.
export function MicMeter({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        stream = mediaStream;
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(mediaStream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        let level = 0;

        const tick = () => {
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            sum += sample * sample;
          }
          // Speech RMS sits around 0.02–0.2; scale it into 0..1.
          const target = Math.min(1, Math.sqrt(sum / samples.length) * 6);
          level += (target - level) * (target > level ? 0.5 : 0.15);
          ref.current?.style.setProperty("--mic", level.toFixed(3));
          frame = requestAnimationFrame(tick);
        };
        tick();
      })
      // Denied or missing: recognition reports the same problem in words.
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close();
      ref.current?.style.setProperty("--mic", "0");
    };
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="flex h-4 items-center gap-0.5"
      style={{ "--mic": 0 } as CSSProperties}
    >
      {BAR_WEIGHTS.map((weight, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full bg-primary"
          style={{
            height: `calc(3px + var(--mic) * ${weight * 13}px)`,
            opacity: "calc(0.35 + var(--mic) * 0.65)",
          }}
        />
      ))}
    </div>
  );
}
