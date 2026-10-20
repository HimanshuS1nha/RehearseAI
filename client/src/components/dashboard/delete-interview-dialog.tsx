import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";

import { useDeleteInterview } from "#/hooks/use-delete-interview";

import type { InterviewType } from "#/types";

export function DeleteInterviewDialog({
  interview,
}: {
  interview: InterviewType;
}) {
  const [open, setOpen] = useState(false);
  const { deleteInterview, isPending } = useDeleteInterview();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${interview.role} interview`}
        >
          <Trash2 />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
            Delete this interview?
          </DialogTitle>
          <DialogDescription>
            {/* Matches the server, which refunds only unstarted interviews. */}
            {interview.status === "created"
              ? "It hasn't started yet, so you'll get the interview back to use again."
              : "Its questions, answers and report go with it. This can't be undone."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              deleteInterview(interview.id, { onSuccess: () => setOpen(false) })
            }
          >
            {isPending && <Loader2 className="animate-spin" />}
            Delete interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
