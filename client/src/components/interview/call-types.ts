// ready       waiting for the user to join (browsers only speak after a click)
// connecting  starting or resuming the interview
// speaking    the interviewer is reading the question aloud
// listening   the microphone is on for the answer
// thinking    the answer is with the server, which picks the next question
// ending      ending early and writing the report
export type CallPhase =
  "ready" | "connecting" | "speaking" | "listening" | "thinking" | "ending";

export type AgentMessage = {
  questionNumber: number;
  topic: string;
  // e.g. "Technical" or "Follow-up".
  kind: string;
  text: string;
};

// Returns the agent's voice level for this frame, from 0 (silent) to 1.
// `time` is the requestAnimationFrame timestamp.
export type LevelSource = (time: number) => number;
