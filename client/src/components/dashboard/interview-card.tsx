import { Link } from "@tanstack/react-router";
import { ArrowRight, Play } from "lucide-react";

import { Button } from "#/components/ui/button";
import { DeleteInterviewDialog } from "#/components/dashboard/delete-interview-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { cn } from "#/lib/utils";

import {
  DIFFICULTY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  INTERVIEW_TYPE_LABELS,
  STATUS_LABELS,
} from "#/constants/interview-labels";

import type { InterviewType } from "#/types";

const MAX_TOPICS = 4;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const STATUS_STYLES: Record<InterviewType["status"], string> = {
  created: "bg-secondary text-secondary-foreground",
  in_progress: "bg-accent text-accent-foreground",
  completed: "bg-primary text-primary-foreground",
  abandoned: "bg-muted text-muted-foreground",
};

function InterviewAction({ interview }: { interview: InterviewType }) {
  switch (interview.status) {
    case "created":
      // The call page starts the interview when it connects.
      return (
        <Button size="sm" asChild>
          <Link
            to="/dashboard/interview/$interviewId/start"
            params={{ interviewId: interview.id }}
          >
            <Play />
            Start
          </Link>
        </Button>
      );
    case "in_progress":
      return (
        <Button size="sm" asChild>
          <Link
            to="/dashboard/interview/$interviewId/start"
            params={{ interviewId: interview.id }}
          >
            Continue
            <ArrowRight />
          </Link>
        </Button>
      );
    case "completed":
      return (
        <Button size="sm" variant="outline" asChild>
          <Link
            to="/dashboard/interview/$interviewId/results"
            params={{ interviewId: interview.id }}
          >
            Results
            <ArrowRight />
          </Link>
        </Button>
      );
    case "abandoned":
      // Ended before the first answer, so there's nothing to review.
      return null;
  }
}

export function InterviewCard({ interview }: { interview: InterviewType }) {
  const extraTopics = interview.topics.length - MAX_TOPICS;
  const date = interview.completed_at ?? interview.created_at;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="font-serif text-lg font-normal">
          {interview.role}
        </CardTitle>
        <CardDescription>
          {EXPERIENCE_LEVEL_LABELS[interview.experience_level]} ·{" "}
          {INTERVIEW_TYPE_LABELS[interview.interview_type]} ·{" "}
          {DIFFICULTY_LABELS[interview.difficulty]}
        </CardDescription>
        <CardAction>
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 font-mono text-[11px]",
              STATUS_STYLES[interview.status],
            )}
          >
            {STATUS_LABELS[interview.status]}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-wrap content-start gap-1.5">
        {interview.topics.slice(0, MAX_TOPICS).map((topic) => (
          <span
            key={topic}
            className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {topic}
          </span>
        ))}
        {extraTopics > 0 && (
          <span className="px-1 py-0.5 text-xs text-muted-foreground">
            +{extraTopics} more
          </span>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3">
        {/* Formatted in the visitor's timezone, which the server can't know. */}
        <span
          className="font-mono text-[11px] text-muted-foreground"
          suppressHydrationWarning
        >
          {interview.completed_at ? "Completed" : "Created"}{" "}
          {dateFormat.format(new Date(date))}
        </span>
        <div className="flex items-center gap-1">
          <DeleteInterviewDialog interview={interview} />
          <InterviewAction interview={interview} />
        </div>
      </CardFooter>
    </Card>
  );
}
