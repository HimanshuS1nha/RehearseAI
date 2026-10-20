import { cn } from "#/lib/utils";

// Mirrors the options the interview API accepts.
const OPTION_FIELDS = [
  {
    label: "Experience",
    options: ["Entry", "Junior", "Mid", "Senior", "Staff"],
    selected: "Mid",
  },
  {
    label: "Interview type",
    options: ["Technical", "Behavioral", "System design", "Mixed"],
    selected: "Technical",
  },
  {
    label: "Difficulty",
    options: ["Easy", "Medium", "Hard"],
    selected: "Medium",
  },
];

const TOPICS = ["Postgres", "Queues", "Caching", "API design"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <dt className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
      {children}
    </dt>
  );
}

function InterviewBrief() {
  return (
    <dl className="space-y-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <div>
        <FieldLabel>Role</FieldLabel>
        <dd className="border-b pb-2 font-serif text-xl">Backend engineer</dd>
      </div>

      {OPTION_FIELDS.map((field) => (
        <div key={field.label}>
          <FieldLabel>{field.label}</FieldLabel>
          <dd className="flex flex-wrap gap-1.5">
            {field.options.map((option) => (
              <span
                key={option}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-sm",
                  option === field.selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {option}
              </span>
            ))}
          </dd>
        </div>
      ))}

      <div>
        <FieldLabel>Topics · up to 10</FieldLabel>
        <dd className="flex flex-wrap gap-1.5">
          {TOPICS.map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-accent px-2.5 py-1 text-sm text-accent-foreground"
            >
              {topic}
            </span>
          ))}
        </dd>
      </div>

      <div>
        <FieldLabel>Job description · optional</FieldLabel>
        <dd className="relative max-h-16 overflow-hidden text-sm leading-relaxed text-muted-foreground">
          You'll own the job pipeline that processes 2M events a day: design for
          retries, idempotency and back-pressure, and keep p99 latency on our
          public API under 200ms…
          <span className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-card" />
        </dd>
      </div>
    </dl>
  );
}

export function SetupSection() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-balance sm:text-4xl">
            Set it up like the interview on your calendar
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Pick the role, your level and the topics from the listing. Paste the
            job description if you have it, and the questions lean toward what
            that team cares about.
          </p>
          <ul className="mt-8 max-w-md space-y-4 border-l-2 border-primary/40 pl-5 text-[15px] leading-relaxed">
            <li>
              Difficulty starts where you set it, then steps up after strong
              answers and down after weak ones.
            </li>
            <li>
              Questions are pitched at your experience level, from entry to
              staff.
            </li>
            <li>No question gets asked twice, rephrased or otherwise.</li>
          </ul>
        </div>

        <InterviewBrief />
      </div>
    </section>
  );
}
