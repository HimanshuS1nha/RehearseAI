import type { EvaluationType } from "#/types";

function AreaScore({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{score}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ReportSummary({ evaluation }: { evaluation: EvaluationType }) {
  return (
    <section className="grid gap-10 rounded-xl border bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-[auto_1fr_1.4fr] lg:gap-12">
      <div>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Overall
        </p>
        <p className="mt-1 font-serif text-7xl leading-none tracking-tight">
          {evaluation.overall_score}
          <span className="text-2xl text-muted-foreground">/100</span>
        </p>
      </div>

      <div className="space-y-4 lg:pt-5">
        <AreaScore
          label="Technical knowledge"
          score={evaluation.technical_score}
        />
        <AreaScore
          label="Communication"
          score={evaluation.communication_score}
        />
        <AreaScore
          label="Problem solving"
          score={evaluation.problem_solving_score}
        />
      </div>

      <blockquote className="border-l-2 border-primary/40 pl-5 lg:pt-1">
        <p className="font-serif text-lg leading-relaxed text-pretty italic">
          {evaluation.summary}
        </p>
        <footer className="mt-3 font-mono text-[11px] text-muted-foreground">
          Practice feedback, not a hiring decision.
        </footer>
      </blockquote>
    </section>
  );
}
