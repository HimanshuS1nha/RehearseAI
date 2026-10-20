// Reading the interviewer's questions aloud with the browser's built-in
// speechSynthesis. Recognising the answers is react-speech-recognition's job.
//
// speechSynthesis fails quietly on some setups. Chromium on Linux without
// speech-dispatcher, for one, accepts utterances and then never starts or
// finishes them. So nothing here waits on it without a timeout.

// How long to wait for the browser's voice list, which Chrome fills in
// asynchronously.
const VOICES_TIMEOUT_MS = 1500;
// How long a question may take to start playing before we give up on it.
const START_TIMEOUT_MS = 4000;
// Characters per second, for estimating progress when the voice doesn't
// report word boundaries (Chrome's network voices don't).
const ESTIMATED_CHARS_PER_SECOND = 14;

export const isSpeechSynthesisSupported = () => "speechSynthesis" in window;

// Resolves with the installed voices; empty means the browser can't speak.
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisSupported()) {
    return Promise.resolve([]);
  }

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    return Promise.resolve(voices);
  }

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timeout);
      speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(speechSynthesis.getVoices());
    };
    const timeout = setTimeout(done, VOICES_TIMEOUT_MS);
    speechSynthesis.addEventListener("voiceschanged", done);
  });
}

// Prefer the more natural-sounding voices browsers ship, in the reader's
// language, then any English voice; undefined leaves the browser's default.
const pickVoice = (voices: SpeechSynthesisVoice[]) => {
  const language = navigator.language.split("-")[0];
  const inLanguage = voices.filter((voice) => voice.lang.startsWith(language));
  const english = voices.filter((voice) => voice.lang.startsWith("en"));

  for (const candidates of [inLanguage, english]) {
    if (candidates.length > 0) {
      return (
        candidates.find((voice) =>
          /natural|neural|google|samantha|premium|enhanced/i.test(voice.name),
        ) ?? candidates[0]
      );
    }
  }
  return undefined;
};

// Chrome can garbage-collect an utterance mid-speech, after which its end
// event never fires. Holding them here until they finish prevents that.
const liveUtterances = new Set<SpeechSynthesisUtterance>();

// Speaks `text`, reporting how far through it the voice is (0..1).
// Sentence by sentence, because Chrome silently stops a single utterance
// after about 15 seconds. Calls exactly one of onEnd (finished) or onFail
// (the browser couldn't speak it). Returns a function that stops speaking.
export function speak(
  text: string,
  voices: SpeechSynthesisVoice[],
  {
    onProgress,
    onEnd,
    onFail,
  }: {
    onProgress: (progress: number) => void;
    onEnd: () => void;
    onFail: () => void;
  },
) {
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }

  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const voice = pickVoice(voices);
  let settled = false;
  let started = false;
  let boundariesSeen = false;
  let estimate: ReturnType<typeof setInterval> | undefined;
  let reported = 0;

  const settle = (outcome: () => void) => {
    if (settled) return;
    settled = true;
    clearTimeout(startWatchdog);
    clearInterval(estimate);
    liveUtterances.clear();
    outcome();
  };

  // Nothing played: report failure so the call moves on without the voice.
  const startWatchdog = setTimeout(() => {
    if (!started) {
      speechSynthesis.cancel();
      settle(onFail);
    }
  }, START_TIMEOUT_MS);

  const report = (chars: number) => {
    reported = Math.max(reported, Math.min(chars / text.length, 1));
    onProgress(reported);
  };

  let offset = 0;
  sentences.forEach((sentence, index) => {
    const start = offset;
    offset += sentence.length;
    const end = offset;
    const isLast = index === sentences.length - 1;

    const utterance = new SpeechSynthesisUtterance(sentence);
    liveUtterances.add(utterance);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => {
      started = true;
      const startedAt = performance.now();
      clearInterval(estimate);
      estimate = setInterval(() => {
        if (!boundariesSeen) {
          const elapsed = (performance.now() - startedAt) / 1000;
          report(Math.min(end, start + elapsed * ESTIMATED_CHARS_PER_SECOND));
        }
      }, 80);
    };
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        boundariesSeen = true;
        report(start + event.charIndex);
      }
    };
    utterance.onend = () => {
      liveUtterances.delete(utterance);
      report(end);
      if (isLast) settle(onEnd);
    };
    utterance.onerror = (event) => {
      // Our own cancel reports these; anything else means it can't speak.
      if (event.error !== "interrupted" && event.error !== "canceled") {
        speechSynthesis.cancel();
        settle(started ? onEnd : onFail);
      }
    };

    speechSynthesis.speak(utterance);
  });

  return () => {
    settled = true;
    clearTimeout(startWatchdog);
    clearInterval(estimate);
    liveUtterances.clear();
    speechSynthesis.cancel();
  };
}
