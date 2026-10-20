import { CornerDownLeft } from "lucide-react";

// The loop the interview runs for every question, in order.
const STEPS = [
  {
    title: "Ask",
    body: "One question, worded the way an interviewer would say it. No hints, no answer key.",
  },
  {
    title: "Answer",
    body: "Type your answer in your own words. Take the time you need to think it through.",
  },
  {
    title: "Score",
    body: "Each answer gets a score out of 100 and a few sentences on what a stronger answer would include.",
  },
  {
    title: "Probe or move on",
    body: "A vague answer gets a follow-up. A solid one moves you to the next topic, or a harder question.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28"
    >
      <div className="max-w-2xl">
        <h2 className="font-serif text-3xl tracking-tight text-balance sm:text-4xl">
          Every question runs the same loop
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          There's no fixed question count. The interview keeps going until your
          topics have been covered well enough to judge, then writes up your
          report.
        </p>
      </div>

      <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="bg-background p-6">
            <span className="font-mono text-xs text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-serif text-xl">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <CornerDownLeft className="size-3.5 text-primary" />
          Back to step 1 until your topics are covered
        </span>
        <span>Then: your final report</span>
      </div>
    </section>
  );
}
