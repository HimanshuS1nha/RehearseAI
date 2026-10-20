import type { InterviewType, QuestionResultType } from "#/types";

export const EXPERIENCE_LEVEL_LABELS: Record<
  InterviewType["experience_level"],
  string
> = {
  entry: "Entry",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
};

export const INTERVIEW_TYPE_LABELS: Record<
  InterviewType["interview_type"],
  string
> = {
  technical: "Technical",
  behavioral: "Behavioral",
  system_design: "System design",
  mixed: "Mixed",
};

export const DIFFICULTY_LABELS: Record<InterviewType["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const STATUS_LABELS: Record<InterviewType["status"], string> = {
  created: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Ended early",
};

export const QUESTION_TYPE_LABELS: Record<
  QuestionResultType["question_type"],
  string
> = {
  technical: "Technical",
  practical: "Practical",
  follow_up: "Follow-up",
  scenario: "Scenario",
  behavioral: "Behavioral",
};
