import type { EvaluationType } from "#/types";

export function ReportNotes({ evaluation }: { evaluation: EvaluationType }) {
  const notes = [
    { heading: "Strengths", items: evaluation.strengths },
    { heading: "To work on", items: evaluation.weaknesses },
    { heading: "Study next", items: evaluation.suggested_learning },
  ];

  return (
    <section className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
      {notes.map((note) => (
        <div key={note.heading} className="bg-background p-6">
          <h2 className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            {note.heading}
          </h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-snug">
            {note.items.map((item) => (
              <li key={item} className="border-l-2 border-primary/30 pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
