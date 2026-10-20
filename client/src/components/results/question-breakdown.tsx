import { ScoreMark } from "#/components/results/score-mark";
import { cn } from "#/lib/utils";

import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from "#/constants/interview-labels";

import type { QuestionResultType } from "#/types";

const anchorId = (questionNumber: number) => `q-${questionNumber}`;

// One chip per question, so the shape of the interview is visible at a glance
// and any question is a click away.
function QuestionIndex({ questions }: { questions: QuestionResultType[] }) {
  return (
    <nav aria-label="Questions" className="flex flex-wrap gap-2">
      {questions.map((question) => (
        <a
          key={question.id}
          href={`#${anchorId(question.question_number)}`}
          className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 font-mono text-xs outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="text-muted-foreground">
            Q{question.question_number}
          </span>
          <span
            className={cn(
              question.score === null
                ? "text-muted-foreground"
                : "text-primary",
            )}
          >
            {question.score ?? "–"}
          </span>
        </a>
      ))}
    </nav>
  );
}

function QuestionEntry({
  question,
  parentNumber,
}: {
  question: QuestionResultType;
  parentNumber: number | undefined;
}) {
  return (
    <li
      id={anchorId(question.question_number)}
      className="grid scroll-mt-6 border-t py-8 md:grid-cols-[1fr_15rem]"
    >
      <div className="md:pr-8">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          <span className="text-foreground">Q{question.question_number}</span>
          <span>·</span>
          <span>{question.topic}</span>
          <span>·</span>
          <span>{DIFFICULTY_LABELS[question.difficulty]}</span>
          <span className="rounded-sm bg-accent px-1.5 py-px text-accent-foreground normal-case">
            {parentNumber
              ? `Follow-up on Q${parentNumber}`
              : QUESTION_TYPE_LABELS[question.question_type]}
          </span>
        </div>

        <p className="mt-3 font-serif text-xl leading-snug text-pretty">
          {question.question}
        </p>

        <div className="mt-5">
          <p className="mb-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Your answer
          </p>
          {question.answer ? (
            <p className="leading-relaxed whitespace-pre-line text-foreground/85">
              {question.answer}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              Not answered. The interview ended here.
            </p>
          )}
        </div>
      </div>

      {/* The margin: a ruled line and the interviewer's note beside the
          answer on wide screens, stacked under it on narrow ones. */}
      {question.score !== null && question.feedback && (
        <aside className="mt-6 flex gap-3 border-l-2 border-primary/60 pl-4 md:mt-0 md:flex-col md:border-primary/40 md:pl-6">
          <ScoreMark score={question.score} />
          <p className="font-serif text-[15px] leading-snug text-primary italic">
            {question.feedback}
          </p>
        </aside>
      )}
    </li>
  );
}

export function QuestionBreakdown({
  questions,
}: {
  questions: QuestionResultType[];
}) {
  const numberById = new Map(questions.map((q) => [q.id, q.question_number]));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-2xl tracking-tight">
          Question by question
        </h2>
        <QuestionIndex questions={questions} />
      </div>

      <ol className="mt-6">
        {questions.map((question) => (
          <QuestionEntry
            key={question.id}
            question={question}
            parentNumber={
              question.parent_question_id
                ? numberById.get(question.parent_question_id)
                : undefined
            }
          />
        ))}
      </ol>
    </section>
  );
}
