export type UserType = {
  id: string;
  name: string;
  email: string;
  interview_credits: number;
};

export type MessageResponseType = {
  message: string;
};

export type InterviewType = {
  id: string;
  role: string;
  experience_level: "entry" | "junior" | "mid" | "senior" | "staff";
  interview_type: "technical" | "behavioral" | "system_design" | "mixed";
  topics: string[];
  difficulty: "easy" | "medium" | "hard";
  job_description: string | null;
  status: "created" | "in_progress" | "completed" | "abandoned";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponseType<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
};

export type InterviewQuestionType = {
  id: string;
  question_number: number;
  question: string;
  topic: string;
  question_type:
    "technical" | "practical" | "follow_up" | "scenario" | "behavioral";
  difficulty: InterviewType["difficulty"];
};

export type InterviewProgressType = {
  status: InterviewType["status"];
  // The question to answer next; null once the interview has ended.
  question: InterviewQuestionType | null;
};

export type QuestionResultType = InterviewQuestionType & {
  parent_question_id: string | null;
  // Null for the question left unanswered when an interview is ended early.
  answer: string | null;
  score: number | null;
  feedback: string | null;
};

export type EvaluationType = {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  strengths: string[];
  weaknesses: string[];
  suggested_learning: string[];
  summary: string;
};

export type InterviewResultsType = {
  evaluation: EvaluationType;
  questions: QuestionResultType[];
};

export type PricingType = {
  // In the currency's smallest unit (paise for INR).
  price_per_interview: number;
  currency: string;
  max_quantity: number;
};

export type CheckoutResponseType = {
  checkout_url: string;
};

export type PaymentType = {
  id: string;
  quantity: number;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired";
  created_at: string;
  paid_at: string | null;
};
