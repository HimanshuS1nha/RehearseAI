export function AuthAside() {
  return (
    <aside className="hidden border-l bg-muted/40 lg:flex lg:items-center lg:justify-center lg:p-16">
      <div className="max-w-md">
        <p className="mb-6 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          From a practice interview
        </p>

        <figure className="rounded-xl border bg-card p-6 shadow-xl">
          <p className="mb-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            You
          </p>
          <p className="text-[15px] leading-relaxed text-foreground/85">
            I'd put a cache in front of the profile endpoint and expire entries
            after five minutes.
          </p>

          <div className="mt-5 flex gap-3 border-t border-primary/40 pt-5">
            <span
              aria-label="Score 71 out of 100"
              className="flex size-9 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-primary font-mono text-sm font-medium text-primary"
            >
              71
            </span>
            <p className="font-serif text-sm leading-snug text-primary italic">
              Solid default. Say what happens when a user edits their profile:
              do they see stale data for five minutes?
            </p>
          </div>
        </figure>

        <p className="mt-8 font-serif text-2xl leading-snug tracking-tight text-balance">
          Every answer comes back with a score and a note on what to add.
        </p>
      </div>
    </aside>
  );
}
