import { Mic } from "lucide-react";

import { Button } from "#/components/ui/button";

// Shown before the call starts. Joining is a click on purpose: browsers only
// let a page speak, and ask for the microphone, after the user acts.
export function JoinPanel({
  isResuming,
  onJoin,
}: {
  isResuming: boolean;
  onJoin: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center text-center">
      <h1 className="font-serif text-3xl tracking-tight">
        {isResuming ? "Pick up where you left off" : "Ready when you are"}
      </h1>
      <p className="mt-3 leading-relaxed text-white/60">
        The interviewer reads each question aloud. Answer out loud; when you
        pause for a few seconds your answer is sent, or press Done answering.
        Your browser will ask to use your microphone.
      </p>
      <Button size="lg" onClick={onJoin} className="mt-8">
        <Mic />
        {isResuming ? "Resume interview" : "Start interview"}
      </Button>
    </section>
  );
}
