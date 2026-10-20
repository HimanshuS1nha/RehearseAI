import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

// Lines appear one after another on load, like the interview happening live.
const REVEAL =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none";

function Row({
  delay,
  speaker,
  tag,
  children,
  note,
}: {
  delay: number;
  speaker: "Interviewer" | "You";
  tag?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div
      className={cn(REVEAL, "grid sm:grid-cols-[1fr_11rem]")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="py-3 pr-5">
        <div className="mb-1 flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          <span>{speaker}</span>
          {tag && (
            <span className="rounded-sm bg-accent px-1.5 py-px text-accent-foreground normal-case">
              {tag}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-[15px] leading-relaxed",
            speaker === "Interviewer"
              ? "font-serif text-base"
              : "text-foreground/85",
          )}
        >
          {children}
        </p>
      </div>
      <div className="border-primary/40 sm:border-l sm:pl-4">{note}</div>
    </div>
  );
}

function MarginNote({
  score,
  delay,
  children,
}: {
  score: number;
  delay: number;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        REVEAL,
        "mb-3 flex gap-3 border-l-2 border-primary/60 pl-3 sm:mt-3 sm:mb-0 sm:flex-col sm:gap-1.5 sm:border-l-0 sm:pl-0",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-label={`Score ${score} out of 100`}
        className="flex size-9 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-primary font-mono text-sm font-medium text-primary"
      >
        {score}
      </span>
      <p className="font-serif text-[13px] leading-snug text-primary italic">
        {children}
      </p>
    </div>
  );
}

export function InterviewTranscript() {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-xl">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/60 px-5 py-3 font-mono text-[11px] text-muted-foreground">
        <span>Backend engineer · mid · technical · medium</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          In progress
        </span>
      </figcaption>

      <div className="px-5 py-2">
        <Row delay={200} speaker="Interviewer" tag="Q1 · queues">
          How would you stop two workers from processing the same job off a
          queue?
        </Row>
        <Row
          delay={900}
          speaker="You"
          note={
            <MarginNote score={62} delay={1700}>
              Right idea. What happens if the worker dies while holding the
              lock? Mention a TTL or a lease.
            </MarginNote>
          }
        >
          I'd take a lock in Redis when a worker picks up the job and delete it
          once the job is done.
        </Row>
        <Row delay={2600} speaker="Interviewer" tag="Follow-up on Q1">
          Say the worker crashes halfway through. What happens to that job, and
          to the lock?
        </Row>
        <Row delay={3300} speaker="You">
          The lock needs an expiry, so it frees itself. Then the job has to go
          back on the queue, which means the handler must be safe to run twice
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground motion-reduce:animate-none"
          />
        </Row>
      </div>
    </figure>
  );
}
