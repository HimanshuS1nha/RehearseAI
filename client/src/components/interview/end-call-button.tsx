import { PhoneOff } from "lucide-react";

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

export function EndCallButton({
  onEnd,
  disabled,
}: {
  onEnd: () => void;
  disabled?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon-lg"
          aria-label="End interview"
          disabled={disabled}
          className="size-14 rounded-full shadow-lg shadow-destructive/30 [&_svg:not([class*='size-'])]:size-6"
        >
          <PhoneOff />
        </Button>
      </DialogTrigger>

      {/* The dialog is portalled outside the call page, so it opts into the
          dark theme itself. */}
      <DialogContent className="dark bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
            End the interview?
          </DialogTitle>
          <DialogDescription>
            You'll get a report on the questions you've answered so far. You
            can't pick this interview up again afterwards.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Keep going</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onEnd}>
              <PhoneOff />
              End interview
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
