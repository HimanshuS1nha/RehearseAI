import { Keyboard, Mic } from "lucide-react";

import { Textarea } from "#/components/ui/textarea";
import { MicMeter } from "#/components/interview/mic-meter";

import type { AnswerMode } from "#/hooks/use-interview-call";

const linkButton =
  "flex items-center gap-1.5 rounded-sm font-mono text-[11px] tracking-wide text-white/50 uppercase outline-none hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 [&_svg]:size-3.5";

// The answer as it's being given: live words from the microphone, or a
// text box when typing. Settled words are solid; words still being
// recognised are dimmed, as they may change.
export function AnswerTranscript({
  mode,
  canUseVoice,
  problem,
  isMicOn,
  finalTranscript,
  interimTranscript,
  typedAnswer,
  onTypedAnswerChange,
  showNoWordsHint,
  onClear,
  onSwitchToTyping,
  onSwitchToVoice,
  disabled,
}: {
  mode: AnswerMode;
  canUseVoice: boolean;
  problem: string | null;
  isMicOn: boolean;
  finalTranscript: string;
  interimTranscript: string;
  typedAnswer: string;
  onTypedAnswerChange: (value: string) => void;
  showNoWordsHint: boolean;
  onClear: () => void;
  onSwitchToTyping: () => void;
  onSwitchToVoice: () => void;
  disabled: boolean;
}) {
  const hasSpokenWords = Boolean(finalTranscript || interimTranscript);

  return (
    <section className="mx-auto w-full max-w-2xl px-6 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-wide text-white/50 uppercase">
          {mode === "voice" ? (
            <>
              <MicMeter active={isMicOn && !disabled} />
              <span className={isMicOn ? "text-primary" : undefined}>
                {isMicOn ? "Listening" : "Mic off"}
              </span>
            </>
          ) : (
            <span>Your answer</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {mode === "voice" && hasSpokenWords && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className={linkButton}
            >
              Start over
            </button>
          )}
          {mode === "voice" ? (
            <button
              type="button"
              onClick={onSwitchToTyping}
              disabled={disabled}
              className={linkButton}
            >
              <Keyboard />
              Type instead
            </button>
          ) : (
            canUseVoice && (
              <button
                type="button"
                onClick={onSwitchToVoice}
                disabled={disabled}
                className={linkButton}
              >
                <Mic />
                Use microphone
              </button>
            )
          )}
        </div>
      </div>

      {mode === "voice" ? (
        <p className="mt-2 max-h-28 overflow-y-auto leading-relaxed">
          {hasSpokenWords ? (
            <>
              <span className="text-white/90">{finalTranscript} </span>
              <span className="text-white/45">{interimTranscript}</span>
            </>
          ) : (
            <span className="text-white/40 italic">
              Start speaking. Your words appear here.
            </span>
          )}
        </p>
      ) : (
        <Textarea
          aria-label="Your answer"
          value={typedAnswer}
          onChange={(e) => onTypedAnswerChange(e.target.value)}
          disabled={disabled}
          maxLength={10_000}
          rows={3}
          autoFocus
          placeholder="Type your answer"
          className="mt-2 max-h-40 border-white/15 bg-white/[0.04] text-white placeholder:text-white/40"
        />
      )}

      {problem && (
        <p role="alert" className="mt-3 text-sm leading-relaxed text-white/70">
          {problem}
        </p>
      )}
      {showNoWordsHint && (
        <p role="status" className="mt-3 text-sm leading-relaxed text-white/70">
          Not picking up any words. If the bars above don't move when you talk,
          check your microphone; if they do, the browser's recognition isn't
          working, so type your answer instead.
        </p>
      )}
    </section>
  );
}
