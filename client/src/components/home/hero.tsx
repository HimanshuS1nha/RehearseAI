import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "#/components/ui/button";
import { InterviewTranscript } from "#/components/home/interview-transcript";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-24 lg:pb-28">
      <div>
        <p className="mb-6 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Mock interviews · technical, behavioral, system design
        </p>
        <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Hear the follow-up question{" "}
          <em className="text-primary">before it counts.</em>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Rehearse runs a practice interview for the role you're going after. It
          asks one question at a time, presses on vague answers, and scores
          every reply so you know exactly what to fix.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link to="/register">
              Start a practice interview
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <a href="#report">See a sample report</a>
          </Button>
        </div>
      </div>

      <InterviewTranscript />
    </section>
  );
}
