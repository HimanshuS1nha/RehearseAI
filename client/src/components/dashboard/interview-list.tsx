import type { ReactNode } from "react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { InterviewCard } from "#/components/dashboard/interview-card";

import { interviewsQueryOptions } from "#/queries/interviews.query";

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <h2 className="font-serif text-xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export function InterviewList({
  search,
  createAction,
  onClearSearch,
}: {
  search: string;
  createAction: ReactNode;
  onClearSearch: () => void;
}) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(interviewsQueryOptions(search));

  const interviews = data.pages.flatMap((page) => page.items);

  if (interviews.length === 0) {
    return search ? (
      <EmptyState
        title={`No interviews match “${search}”`}
        body="Search looks at the role and the topics. Try a shorter word."
        action={
          <Button variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="No interviews yet"
        body="Pick a role, a few topics and a difficulty, and your first practice interview is ready to start."
        action={createAction}
      />
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {interviews.map((interview) => (
          <li key={interview.id} className="grid">
            <InterviewCard interview={interview} />
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage && <Loader2 className="animate-spin" />}
            Show more
          </Button>
        </div>
      )}
    </>
  );
}
