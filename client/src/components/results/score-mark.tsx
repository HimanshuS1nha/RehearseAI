import { cn } from "#/lib/utils";

// The interviewer's mark in the margin: a score circled in pen, tilted the
// way a hand-drawn one would be. Same mark as on the landing page.
export function ScoreMark({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      aria-label={`Score ${score} out of 100`}
      className={cn(
        "flex size-10 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-primary font-mono text-sm font-medium text-primary",
        className,
      )}
    >
      {score}
    </span>
  );
}
