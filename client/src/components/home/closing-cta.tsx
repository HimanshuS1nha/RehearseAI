import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "#/components/ui/button";

export function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl tracking-tight text-balance sm:text-5xl">
          Your next interview has a follow-up in it.{" "}
          <em>Practise answering it.</em>
        </h2>
        <Button size="lg" variant="secondary" asChild className="mt-10">
          <Link to="/register">
            Start a practice interview
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
