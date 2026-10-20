import { useEffect, useState } from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import z from "zod";

import { Button } from "#/components/ui/button";
import { CreateInterviewDialog } from "#/components/dashboard/create-interview-dialog";
import { InterviewList } from "#/components/dashboard/interview-list";
import { InterviewSearch } from "#/components/dashboard/interview-search";

import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { useUser } from "#/hooks/use-user";

import { interviewsQueryOptions } from "#/queries/interviews.query";

import { useBuyInterviewsDialog } from "#/stores/buy-interviews-dialog.store";

const searchValidator = z.object({
  search: z.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/_with-navbar/")({
  validateSearch: searchValidator,
  loaderDeps: ({ search }) => ({ search: search.search ?? "" }),
  loader: ({ context, deps }) =>
    context.queryClient.infiniteQuery(interviewsQueryOptions(deps.search)),
  head: () => ({ meta: [{ title: "Dashboard · Rehearse" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { search = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  // True while the loader fetches results for a new search.
  const isSearching = useRouterState({ select: (state) => state.isLoading });

  // What's typed updates right away; the URL, and so the loader, follow
  // once typing pauses.
  const [draft, setDraft] = useState(search);
  const debouncedDraft = useDebouncedValue(draft.trim(), 300);

  useEffect(() => {
    if (debouncedDraft !== search) {
      navigate({
        search: { search: debouncedDraft || undefined },
        replace: true,
      });
    }
  }, [debouncedDraft, search, navigate]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useUser();
  const openBuyInterviews = useBuyInterviewsDialog((state) => state.open);

  // Offer to buy more up front rather than letting the form fail on submit.
  // The server checks again, in case the count here is out of date.
  const handleCreate = () => {
    if (user && user.interview_credits < 1) {
      openBuyInterviews({ isOutOfCredits: true });
    } else {
      setIsCreateOpen(true);
    }
  };

  const createAction = (
    <Button onClick={handleCreate}>
      <Plus />
      New interview
    </Button>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
            Your interviews
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start a new one, pick up where you left off, or review your results.
          </p>
        </div>
        {createAction}
      </div>

      <div className="mt-8 mb-6">
        <InterviewSearch
          value={draft}
          onChange={setDraft}
          isSearching={isSearching}
        />
      </div>

      <InterviewList
        search={search}
        createAction={createAction}
        onClearSearch={() => setDraft("")}
      />

      <CreateInterviewDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </main>
  );
}
