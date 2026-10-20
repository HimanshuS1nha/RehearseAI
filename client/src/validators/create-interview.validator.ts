import z from "zod";

export const MAX_TOPICS = 10;

// Limits mirror InterviewCreateRequest on the server.
export const createInterviewValidator = z.object({
  role: z
    .string()
    .trim()
    .min(1, "Role is required")
    .max(255, "Role must be at most 255 characters"),
  experienceLevel: z.enum(["entry", "junior", "mid", "senior", "staff"]),
  interviewType: z.enum(["technical", "behavioral", "system_design", "mixed"]),
  topics: z
    .array(
      z.string().trim().min(1).max(100, "Topics are at most 100 characters"),
    )
    .min(1, "Add at least one topic")
    .max(MAX_TOPICS, `Add up to ${MAX_TOPICS} topics`),
  difficulty: z.enum(["easy", "medium", "hard"]),
  jobDescription: z
    .string()
    .max(10_000, "Job description must be at most 10,000 characters"),
});

export type CreateInterviewValidatorType = z.infer<
  typeof createInterviewValidator
>;
