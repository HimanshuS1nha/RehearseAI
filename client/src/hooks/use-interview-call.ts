import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import { axios } from "#/lib/axios";
import { loadVoices, speak } from "#/lib/speech";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import type { CallPhase, LevelSource } from "#/components/interview/call-types";
import type {
  InterviewProgressType,
  InterviewQuestionType,
  InterviewType,
} from "#/types";

// The server's limit on an answer's length.
const MAX_ANSWER_LENGTH = 10_000;

// Auto-submit: after this long with no new words a countdown shows, and
// the answer is sent when it runs out. Speaking again cancels it. Kept
// generous because technical answers have thinking pauses.
const SILENCE_BEFORE_COUNTDOWN_MS = 3000;
const AUTO_SUBMIT_COUNTDOWN_SECONDS = 3;
const AUTO_SUBMIT_AFTER_MS =
  SILENCE_BEFORE_COUNTDOWN_MS + AUTO_SUBMIT_COUNTDOWN_SECONDS * 1000;
// Listening this long without a single word suggests the mic isn't working.
const NO_WORDS_HINT_AFTER_MS = 8000;

const VOICE_UNAVAILABLE =
  "Your browser couldn't read the question aloud, so it's shown here instead. On Linux, Chromium needs speech-dispatcher for voices; Chrome, Edge and Safari have them built in.";

const SPEECH_UNSUPPORTED =
  "This browser can't recognise speech, so type your answers. Chrome, Edge and Safari can take spoken answers.";
const MIC_BLOCKED =
  "Microphone access is blocked. Allow it in your browser's site settings and reload, or type your answer.";
// Errors that mean recognition won't work in this browser, however often
// it restarts. The library only handles not-allowed, and otherwise retries
// these forever without a word.
const FATAL_RECOGNITION_ERRORS: Partial<Record<string, string>> = {
  network:
    "This browser has speech recognition but can't reach the service behind it. Brave, Opera, Vivaldi and plain Chromium lack Google's speech service. Use Chrome, Edge or Safari to answer out loud, or type your answer.",
  "service-not-allowed":
    "This browser won't let the page use speech recognition. Use Chrome, Edge or Safari to answer out loud, or type your answer.",
  "audio-capture": "No microphone found. Connect one, or type your answer.",
  "language-not-supported":
    "Speech recognition doesn't support your browser's language, so type your answer.",
};

// speechSynthesis gives no access to its audio, so the orb follows a
// voice-like curve while it speaks: syllable bursts on a slower phrase
// envelope. Other phases breathe or pulse quietly.
function levelFor(phase: CallPhase, time: number) {
  const seconds = time / 1000;
  switch (phase) {
    case "speaking": {
      const syllables = Math.abs(Math.sin(seconds * 7.3));
      const phrase = 0.55 + 0.45 * Math.abs(Math.sin(seconds * 1.9 + 0.7));
      const flutter = 0.5 + 0.5 * Math.sin(seconds * 23);
      return 0.18 + phrase * (0.55 * syllables + 0.2 * flutter * syllables);
    }
    case "connecting":
    case "thinking":
    case "ending":
      return 0.14 + 0.06 * Math.sin(seconds * 5);
    case "ready":
    case "listening":
      return 0.06 + 0.04 * Math.sin(seconds * 1.6);
  }
}

// The words alone, so Chrome tidying "so the lock" into "So the lock." as
// it settles doesn't count as more speech.
const normaliseWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const startMic = () =>
  SpeechRecognition.startListening({
    continuous: true,
    language: navigator.language,
  }).catch(() => undefined);

// The library's stop and abort promises resolve only when a running
// recognizer reports that it ended. With the mic already off (typing, after
// a recognition error, or in Firefox) they never settle, so these fire and
// forget instead of being awaited.

// Ends listening and drops anything not yet recognised.
const stopMic = () => void SpeechRecognition.abortListening();
// Ends listening but keeps the words still being recognised.
const pauseMic = () => void SpeechRecognition.stopListening();

export type AnswerMode = "voice" | "typing";

export function useInterviewCall(interview: InterviewType) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const interviewId = interview.id;

  const {
    transcript,
    finalTranscript,
    interimTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({ clearTranscriptOnListen: false });

  const [phase, setPhase] = useState<CallPhase>("ready");
  const [question, setQuestion] = useState<InterviewQuestionType | null>(null);
  const [progress, setProgress] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [prefersVoice, setPrefersVoice] = useState(true);
  const [typedAnswer, setTypedAnswer] = useState("");
  // Time since the last new words, and since listening started, ticked
  // while listening; they drive the countdown and the no-words hint.
  const [silentFor, setSilentFor] = useState(0);
  const [listeningFor, setListeningFor] = useState(0);

  const speechProblem = !browserSupportsSpeechRecognition
    ? SPEECH_UNSUPPORTED
    : !isMicrophoneAvailable
      ? MIC_BLOCKED
      : recognitionError;
  const canUseVoice = speechProblem === null;
  const answerMode: AnswerMode =
    canUseVoice && prefersVoice ? "voice" : "typing";
  const answer = answerMode === "voice" ? transcript : typedAnswer;

  // Read inside speech callbacks and timers, which outlive renders.
  const phaseRef = useRef(phase);
  const statusRef = useRef(interview.status);
  const questionRef = useRef(question);
  const answerRef = useRef(answer);
  const answerModeRef = useRef(answerMode);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const voiceBrokenRef = useRef(false);
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const lastSpeechAtRef = useRef<number | null>(null);
  const listenStartedAtRef = useRef(0);
  // submitAnswer is defined further down; the auto-submit timer calls it
  // through this.
  const submitAnswerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    phaseRef.current = phase;
    questionRef.current = question;
    answerRef.current = answer;
    answerModeRef.current = answerMode;
  }, [phase, question, answer, answerMode]);

  // Stop retrying recognition that can't work, and say why.
  useEffect(() => {
    const recognition = SpeechRecognition.getRecognition();
    if (!recognition) return;

    const onError = (event: SpeechRecognitionErrorEvent) => {
      const message = FATAL_RECOGNITION_ERRORS[event.error];
      if (message) {
        setRecognitionError(message);
        stopMic();
      }
    };
    recognition.addEventListener("error", onError);
    return () => recognition.removeEventListener("error", onError);
  }, []);

  // --- Auto-submit -------------------------------------------------------------

  // New words restart the silence clock. Comparing words, not raw text,
  // ignores Chrome re-punctuating what it already heard.
  const heardWords = normaliseWords(transcript);
  useEffect(() => {
    if (heardWords) {
      lastSpeechAtRef.current = performance.now();
    }
  }, [heardWords]);

  useEffect(() => {
    if (phase !== "listening") return;

    const interval = setInterval(() => {
      const now = performance.now();
      setListeningFor(now - listenStartedAtRef.current);

      const lastSpeechAt = lastSpeechAtRef.current;
      const silent =
        lastSpeechAt === null || answerModeRef.current !== "voice"
          ? 0
          : now - lastSpeechAt;
      setSilentFor(silent);

      if (silent >= AUTO_SUBMIT_AFTER_MS) {
        lastSpeechAtRef.current = null;
        submitAnswerRef.current();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phase]);

  const resetSilence = () => {
    lastSpeechAtRef.current = null;
    setSilentFor(0);
  };

  const isAutoSubmitting =
    phase === "listening" &&
    answerMode === "voice" &&
    silentFor >= SILENCE_BEFORE_COUNTDOWN_MS;
  const autoSubmitIn = isAutoSubmitting
    ? Math.max(1, Math.ceil((AUTO_SUBMIT_AFTER_MS - silentFor) / 1000))
    : null;

  // --- Interviewer ---------------------------------------------------------------

  const refreshInterview = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getInterviews] }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.getInterview, interviewId],
        }),
      ]),
    [queryClient, interviewId],
  );

  const listen = useCallback(() => {
    setPhase("listening");
    phaseRef.current = "listening";
    listenStartedAtRef.current = performance.now();
    setListeningFor(0);
    lastSpeechAtRef.current = null;
    setSilentFor(0);
    if (answerModeRef.current === "voice") {
      void startMic();
    }
  }, []);

  // Reads the question aloud, then listens. If the browser can't speak,
  // the question is shown in full and listening starts straight away.
  const say = useCallback(
    (text: string) => {
      const showInstead = () => {
        voiceBrokenRef.current = true;
        setVoiceError(VOICE_UNAVAILABLE);
        setProgress(1);
        listen();
      };

      if (voiceBrokenRef.current) {
        setProgress(1);
        listen();
        return;
      }

      setProgress(0);
      setPhase("speaking");
      phaseRef.current = "speaking";
      stopSpeakingRef.current = speak(text, voicesRef.current, {
        onProgress: setProgress,
        onEnd: listen,
        onFail: showInstead,
      });
    },
    [listen],
  );

  const ask = useCallback(
    (next: InterviewQuestionType) => {
      resetTranscript();
      setTypedAnswer("");
      setQuestion(next);
      say(next.question);
    },
    [resetTranscript, say],
  );

  const handleProgress = useCallback(
    async (progressResponse: InterviewProgressType) => {
      statusRef.current = progressResponse.status;
      if (progressResponse.question) {
        ask(progressResponse.question);
        return;
      }

      await refreshInterview();
      if (progressResponse.status === "completed") {
        navigate({
          to: "/dashboard/interview/$interviewId/results",
          params: { interviewId },
        });
      } else {
        // Abandoned: ended before anything was answered, so no report.
        ToastHelper.success("Interview ended");
        navigate({ to: "/dashboard" });
      }
    },
    [ask, refreshInterview, navigate, interviewId],
  );

  // --- Server ----------------------------------------------------------------------

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<InterviewProgressType>(
        API_ROUTES.interviews.start(interviewId),
      );
      return data;
    },
  });

  const currentQuestionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.get<InterviewQuestionType>(
        API_ROUTES.interviews.currentQuestion(interviewId),
      );
      return data;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (values: { question_id: string; answer: string }) => {
      const { data } = await axios.post<InterviewProgressType>(
        API_ROUTES.interviews.answer(interviewId),
        values,
      );
      return data;
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<InterviewProgressType>(
        API_ROUTES.interviews.end(interviewId),
      );
      return data;
    },
  });

  // --- Actions -----------------------------------------------------------------------

  // Must run from a click: browsers only let a page speak after one.
  const join = useCallback(async () => {
    setPhase("connecting");
    phaseRef.current = "connecting";

    voicesRef.current = await loadVoices();
    if (voicesRef.current.length === 0) {
      voiceBrokenRef.current = true;
      setVoiceError(VOICE_UNAVAILABLE);
    }

    try {
      if (statusRef.current === "created") {
        const started = await startMutation.mutateAsync();
        await refreshInterview();
        await handleProgress(started);
      } else {
        ask(await currentQuestionMutation.mutateAsync());
      }
    } catch (error) {
      ToastHelper.error(error as Error);
      setPhase("ready");
    }
  }, [
    startMutation,
    currentQuestionMutation,
    refreshInterview,
    handleProgress,
    ask,
  ]);

  const submitAnswer = useCallback(async () => {
    const current = questionRef.current;
    const text = answerRef.current.trim().slice(0, MAX_ANSWER_LENGTH);
    if (!current || !text || phaseRef.current !== "listening") return;

    setPhase("thinking");
    phaseRef.current = "thinking";
    stopMic();

    try {
      await handleProgress(
        await answerMutation.mutateAsync({
          question_id: current.id,
          answer: text,
        }),
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        // Answered already, e.g. from another tab: catch up to where the
        // interview actually is.
        try {
          ask(await currentQuestionMutation.mutateAsync());
          return;
        } catch {
          // Fall through to keeping the answer and listening again.
        }
      }
      // The answer is still there to send again; the server finishes the
      // stalled run when the same answer comes back.
      ToastHelper.error(error as Error);
      listen();
    }
  }, [handleProgress, answerMutation, currentQuestionMutation, ask, listen]);

  useEffect(() => {
    submitAnswerRef.current = () => void submitAnswer();
  }, [submitAnswer]);

  // Cancels the countdown. It starts again only after more speech and
  // another pause.
  const keepTalking = resetSilence;

  const repeatQuestion = useCallback(() => {
    const current = questionRef.current;
    if (!current) return;
    pauseMic();
    say(current.question);
  }, [say]);

  const clearAnswer = () => {
    resetTranscript();
    setTypedAnswer("");
    resetSilence();
  };

  const switchToTyping = () => {
    stopMic();
    // Carry over whatever was said, to edit rather than retype.
    setTypedAnswer((typed) => typed || transcript);
    setPrefersVoice(false);
    resetSilence();
  };

  const switchToVoice = () => {
    setPrefersVoice(true);
    if (phaseRef.current === "listening") {
      void startMic();
    }
  };

  const end = useCallback(async () => {
    const previous = phaseRef.current;
    stopSpeakingRef.current?.();
    stopMic();

    // Nothing has started yet, so there's nothing to end on the server.
    if (statusRef.current === "created" || previous === "ready") {
      navigate({ to: "/dashboard" });
      return;
    }

    setPhase("ending");
    phaseRef.current = "ending";
    try {
      await handleProgress(await endMutation.mutateAsync());
    } catch (error) {
      ToastHelper.error(error as Error);
      listen();
    }
  }, [navigate, handleProgress, endMutation, listen]);

  // Silence everything when leaving the page.
  useEffect(
    () => () => {
      stopSpeakingRef.current?.();
      stopMic();
    },
    [],
  );

  const getLevel: LevelSource = useCallback(
    (time) => levelFor(phaseRef.current, time),
    [],
  );

  return {
    phase,
    question,
    progress,
    getLevel,
    voiceError,

    answerMode,
    canUseVoice,
    speechProblem,
    // The mic is actually open, as opposed to the phase saying it should be.
    isMicOn: listening,
    finalTranscript,
    interimTranscript,
    typedAnswer,
    setTypedAnswer,
    hasAnswer: answer.trim().length > 0,
    autoSubmitIn,
    showNoWordsHint:
      phase === "listening" &&
      answerMode === "voice" &&
      !transcript &&
      listeningFor >= NO_WORDS_HINT_AFTER_MS,

    join,
    submitAnswer,
    keepTalking,
    repeatQuestion,
    clearAnswer,
    switchToTyping,
    switchToVoice,
    end,
  };
}
