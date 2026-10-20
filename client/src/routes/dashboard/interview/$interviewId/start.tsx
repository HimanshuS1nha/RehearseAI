import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Check, Mic, RotateCcw } from "lucide-react";

import { Button } from "#/components/ui/button";
import { AgentCaption } from "#/components/interview/agent-caption";
import { AgentOrb } from "#/components/interview/agent-orb";
import { AnswerTranscript } from "#/components/interview/answer-transcript";
import { EndCallButton } from "#/components/interview/end-call-button";
import { JoinPanel } from "#/components/interview/join-panel";
import { cn } from "#/lib/utils";

import { useInterviewCall } from "#/hooks/use-interview-call";

import { QUESTION_TYPE_LABELS } from "#/constants/interview-labels";

import { interviewQueryOptions } from "#/queries/interviews.query";

import type { CallPhase } from "#/components/interview/call-types";

export const Route = createFileRoute("/dashboard/interview/$interviewId/start")(
  {
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

      if (interview.status === "completed") {
        throw redirect({
          to: "/dashboard/interview/$interviewId/results",
          params: { interviewId },
        });
      }
      if (interview.status === "abandoned") {
        throw redirect({ to: "/dashboard" });
      }
    },
    head: () => ({ meta: [{ title: "Interview · Rehearse" }] }),
    component: RouteComponent,
    notFoundComponent: () => (
      <Notice
        title="This interview isn't available"
        body="It may have been deleted, or the link is wrong."
      />
    ),
  },
);

const PHASE_LABELS: Record<CallPhase, string> = {
  ready: "Not started",
  connecting: "Connecting",
  speaking: "Interviewer is speaking",
  listening: "Listening. Answer out loud",
  thinking: "Thinking",
  ending: "Writing your report",
};

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

// A full-screen message on the call's black background.
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-black px-4 text-center text-white">
      <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-white/60">{body}</p>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Back to your interviews</Link>
      </Button>
    </div>
  );
}

function RouteComponent() {
  const { interviewId } = Route.useParams();
  const { data: interview } = useSuspenseQuery(
    interviewQueryOptions(interviewId),
  );
  const call = useInterviewCall(interview);
  const { phase, question, progress } = call;
  const elapsed = useElapsed(phase !== "ready");

  const isBusy = phase === "connecting" || phase === "ending";
  const isCountingDown = call.autoSubmitIn !== null;

  return (
    // Always dark, whatever the app theme: a call screen, lit only by the orb.
    <div className="dark flex min-h-svh flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg">{interview.role}</p>
          <p className="font-mono text-[11px] tracking-wide text-white/50 uppercase">
            Practice interview
            {question && ` · Question ${question.question_number}`}
          </p>
        </div>
        {phase !== "ready" && (
          <p
            className="flex items-center gap-2 font-mono text-sm text-white/70 tabular-nums"
            aria-label={`Elapsed time ${elapsed}`}
          >
            <span className="size-2 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" />
            {elapsed}
          </p>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
        <AgentOrb getLevel={call.getLevel} />
        {phase === "ready" ? (
          <JoinPanel
            isResuming={interview.status === "in_progress"}
            onJoin={call.join}
          />
        ) : (
          <p
            role="status"
            className={cn(
              "font-mono text-xs tracking-widest uppercase transition-colors",
              phase === "listening" ? "text-primary" : "text-white/50",
            )}
          >
            {PHASE_LABELS[phase]}
          </p>
        )}
      </main>

      <footer className="flex flex-col items-center gap-6 px-4 pt-2 pb-8 sm:pb-10">
        {question && (
          <AgentCaption
            message={{
              questionNumber: question.question_number,
              topic: question.topic,
              kind: QUESTION_TYPE_LABELS[question.question_type],
              text: question.question,
            }}
            // Fully shown again once it has been read out.
            progress={phase === "speaking" ? progress : 1}
          />
        )}

        {call.voiceError && question && (
          <p className="max-w-2xl px-6 text-center text-sm text-white/50 sm:px-8">
            {call.voiceError}
          </p>
        )}

        {(phase === "listening" || phase === "thinking") && (
          <AnswerTranscript
            mode={call.answerMode}
            canUseVoice={call.canUseVoice}
            problem={call.speechProblem}
            isMicOn={call.isMicOn}
            finalTranscript={call.finalTranscript}
            interimTranscript={call.interimTranscript}
            typedAnswer={call.typedAnswer}
            onTypedAnswerChange={call.setTypedAnswer}
            showNoWordsHint={call.showNoWordsHint}
            onClear={call.clearAnswer}
            onSwitchToTyping={call.switchToTyping}
            onSwitchToVoice={call.switchToVoice}
            disabled={phase !== "listening"}
          />
        )}

        {isCountingDown && (
          <p
            role="status"
            className="text-center font-mono text-xs tracking-wide text-primary uppercase"
          >
            Sending your answer in {call.autoSubmitIn}s. Keep talking to add
            more
          </p>
        )}

        <div className="grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex justify-end">
            {isCountingDown ? (
              <Button
                variant="ghost"
                onClick={call.keepTalking}
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Mic />
                Keep talking
              </Button>
            ) : (
              // Re-reading needs a working voice.
              phase === "listening" &&
              !call.voiceError && (
                <Button
                  variant="ghost"
                  onClick={call.repeatQuestion}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw />
                  Hear again
                </Button>
              )
            )}
          </div>

          <EndCallButton onEnd={call.end} disabled={isBusy} />

          <div className="flex justify-start">
            {(phase === "listening" || phase === "thinking") && (
              <Button
                onClick={() => void call.submitAnswer()}
                disabled={phase !== "listening" || !call.hasAnswer}
              >
                <Check />
                {isCountingDown ? "Send now" : "Done answering"}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
