import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { Button } from "#/components/ui/button";
import { QuestionBreakdown } from "#/components/results/question-breakdown";
import { ReportNotes } from "#/components/results/report-notes";
import { ReportSummary } from "#/components/results/report-summary";
import { ResultsHeader } from "#/components/results/results-header";

import {
  DIFFICULTY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "#/constants/interview-labels";

import {
  interviewQueryOptions,
  interviewResultsQueryOptions,
} from "#/queries/interviews.query";

export const Route = createFileRoute(
  "/dashboard/interview/$interviewId/results",
)({
  loader: async ({ context: { queryClient }, params: { interviewId } }) => {
    let interview;
    try {
      interview = await queryClient.query(interviewQueryOptions(interviewId));
    } catch (error) {
      // 404 is someone else's or a deleted interview, 422 a malformed ID.
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404 || status === 422) {
        throw notFound();
      }
      throw error;
    }

    // Only a completed interview has a report.
    // TODO: Send in-progress ones to the interview route once it exists.
    if (interview.status !== "completed") {
      throw redirect({ to: "/dashboard" });
    }

    await queryClient.query(interviewResultsQueryOptions(interviewId));
  },
  head: () => ({ meta: [{ title: "Interview report · Rehearse" }] }),
  component: RouteComponent,
  notFoundComponent: NotFound,
});

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

function RouteComponent() {
  const { interviewId } = Route.useParams();
  const { data: interview } = useSuspenseQuery(
    interviewQueryOptions(interviewId),
  );
  const {
    data: { evaluation, questions },
  } = useSuspenseQuery(interviewResultsQueryOptions(interviewId));

  const answered = questions.filter((q) => q.answer !== null).length;
  const followUps = questions.filter((q) => q.parent_question_id).length;

  return (
    <>
      <ResultsHeader />

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:py-14">
        <div>
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {EXPERIENCE_LEVEL_LABELS[interview.experience_level]} ·{" "}
            {INTERVIEW_TYPE_LABELS[interview.interview_type]} ·{" "}
            {DIFFICULTY_LABELS[interview.difficulty]}
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            {interview.role}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {interview.completed_at &&
              `${dateFormat.format(new Date(interview.completed_at))} · `}
            {answered} of {questions.length} questions answered
            {followUps > 0 &&
              ` · ${followUps} follow-up${followUps > 1 ? "s" : ""}`}
          </p>
        </div>

        <ReportSummary evaluation={evaluation} />
        <ReportNotes evaluation={evaluation} />
        <QuestionBreakdown questions={questions} />
      </main>
    </>
  );
}

function NotFound() {
  return (
    <>
      <ResultsHeader />

      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="font-serif text-3xl tracking-tight">
          This report isn't available
        </h1>
        <p className="mt-3 text-muted-foreground">
          The interview may have been deleted, or the link is wrong.
        </p>
        <Button asChild className="mt-8">
          <Link to="/dashboard">Back to your interviews</Link>
        </Button>
      </main>
    </>
  );
}
