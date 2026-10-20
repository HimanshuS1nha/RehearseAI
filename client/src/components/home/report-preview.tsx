const AREA_SCORES = [
  { label: "Technical knowledge", score: 78 },
  { label: "Communication", score: 71 },
  { label: "Problem solving", score: 66 },
];

const NOTES = [
  {
    heading: "Strengths",
    items: [
      "Clear on Postgres indexing, including when a partial index beats a full one.",
      "Explained cache invalidation trade-offs with a concrete example.",
    ],
  },
  {
    heading: "To work on",
    items: [
      "Locking answers skipped failure cases until prompted (Q1).",
      "API design answer named endpoints but not pagination or versioning.",
    ],
  },
  {
    heading: "Study next",
    items: [
      "Idempotent job handlers and at-least-once delivery",
      "Leases and fencing tokens for distributed locks",
      "Cursor-based pagination",
    ],
  },
];

function ReportCard() {
  return (
    <article className="rounded-xl border bg-card shadow-xl">
      <header className="flex items-end justify-between gap-6 border-b p-6 sm:p-8">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Overall
          </p>
          <p className="mt-1 font-serif text-6xl leading-none tracking-tight">
            74<span className="text-2xl text-muted-foreground">/100</span>
          </p>
        </div>
        <p className="text-right font-mono text-[11px] leading-relaxed text-muted-foreground">
          Backend engineer
          <br />6 questions · 1 follow-up
        </p>
      </header>

      <div className="space-y-4 border-b p-6 sm:p-8">
        {AREA_SCORES.map((area) => (
          <div key={area.label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{area.label}</span>
              <span className="font-mono text-muted-foreground">
                {area.score}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${area.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
        {NOTES.map((note) => (
          <section key={note.heading}>
            <h3 className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
              {note.heading}
            </h3>
            <ul className="space-y-2 text-sm leading-snug">
              {note.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

export function ReportPreview() {
  return (
    <section id="report" className="scroll-mt-20 border-y bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-20 lg:py-28">
        <div className="lg:col-start-2 lg:row-start-1">
          <h2 className="font-serif text-3xl tracking-tight text-balance sm:text-4xl">
            A report that tells you what to study tonight
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            When the interview ends you get three scores, the strengths and gaps
            behind them, and a short list of what to practise next. Every point
            refers back to a question you answered.
          </p>
          <p className="mt-6 border-l-2 border-primary/40 pl-5 font-serif text-lg text-primary italic">
            It's feedback for practice, not a verdict on whether you'd get the
            job.
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
            You can also open every question to see your answer, its score and
            the feedback on it. End early and you still get a report on what you
            answered.
          </p>
        </div>

        <div className="lg:col-start-1 lg:row-start-1">
          <ReportCard />
        </div>
      </div>
    </section>
  );
}
