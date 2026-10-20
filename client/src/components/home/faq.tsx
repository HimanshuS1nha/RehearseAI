import { Plus } from "lucide-react";

const QUESTIONS = [
  {
    question: "Who is asking the questions?",
    answer:
      "An AI model playing the interviewer. It reads your setup and every answer so far before writing the next question, which is how it knows when to follow up.",
  },
  {
    question: "How long does an interview take?",
    answer:
      "There's no set number of questions. It ends once your topics are covered well enough to give useful feedback. You can end it early and still get a report.",
  },
  {
    question: "Do I type or speak my answers?",
    answer: "You type them. No camera or microphone needed.",
  },
  {
    question: "Do I need a job description?",
    answer:
      "No. Role, level, interview type, topics and difficulty are enough. A job description just helps the questions match a specific team.",
  },
  {
    question: "Can anyone else see my results?",
    answer: "No. Your interviews and reports are visible only to you.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-20 lg:py-28"
    >
      <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Questions
      </h2>

      <div className="divide-y border-y">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-5 text-left font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <p className="max-w-xl pb-5 leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
