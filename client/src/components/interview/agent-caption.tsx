import { cn } from "#/lib/utils";

import type { AgentMessage } from "#/components/interview/call-types";

// The agent's latest message as live captions. Words fill in as they're
// spoken (`progress` 0..1); the rest is already laid out, dimmed, so the
// text never reflows while it's being read.
export function AgentCaption({
  message,
  progress,
}: {
  message: AgentMessage | null;
  progress: number;
}) {
  if (!message) {
    return null;
  }

  const words = message.text.split(" ");
  const spoken = Math.ceil(words.length * progress);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6">
      <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] tracking-wide text-white/50 uppercase">
        <span className="text-primary">Interviewer</span>
        <span>·</span>
        <span>Q{message.questionNumber}</span>
        <span>·</span>
        <span>{message.topic}</span>
        <span>·</span>
        <span>{message.kind}</span>
      </p>

      {/* Screen readers get the whole message once, not word by word. */}
      <p className="sr-only" aria-live="polite">
        {message.text}
      </p>
      <p
        aria-hidden
        className="mt-3 font-serif text-lg leading-relaxed text-pretty sm:text-xl"
      >
        {words.map((word, index) => (
          <span
            key={index}
            className={cn(
              "transition-colors duration-200",
              index < spoken ? "text-white" : "text-white/25",
            )}
          >
            {word}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
