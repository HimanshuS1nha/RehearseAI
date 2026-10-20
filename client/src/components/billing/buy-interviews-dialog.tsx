import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus } from "lucide-react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

import { useCheckout } from "#/hooks/use-checkout";
import { useUser } from "#/hooks/use-user";

import { formatPrice } from "#/helpers/format-price";

import { pricingQueryOptions } from "#/queries/billing.query";

import { useBuyInterviewsDialog } from "#/stores/buy-interviews-dialog.store";

import type { PricingType } from "#/types";

const PRESETS = [1, 5, 10, 25];

const pluralize = (count: number) =>
  `${count} interview${count === 1 ? "" : "s"}`;

// Mounted once in the root route; opened from anywhere through the store.
export function BuyInterviewsDialog() {
  const { isOpen, isOutOfCredits, close } = useBuyInterviewsDialog();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <BuyInterviewsContent isOutOfCredits={isOutOfCredits} />
      </DialogContent>
    </Dialog>
  );
}

// Separate so it unmounts with the closed dialog, and the quantity starts
// over each time it opens.
function BuyInterviewsContent({ isOutOfCredits }: { isOutOfCredits: boolean }) {
  const { user } = useUser();
  const { data: pricing, isPending, isError } = useQuery(pricingQueryOptions);

  const credits = user?.interview_credits ?? 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl font-normal tracking-tight">
          {isOutOfCredits ? "You're out of interviews" : "Buy interviews"}
        </DialogTitle>
        <DialogDescription>
          {isOutOfCredits
            ? "Buy more to set up your next one. They don't expire."
            : `You have ${pluralize(credits)} left. Bought ones don't expire.`}
        </DialogDescription>
      </DialogHeader>

      {isPending ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Couldn't load pricing. Close this and try again.
        </p>
      ) : (
        <QuantityForm pricing={pricing} />
      )}
    </>
  );
}

function QuantityForm({ pricing }: { pricing: PricingType }) {
  const { checkout, isPending } = useCheckout();
  const [quantity, setQuantity] = useState(1);

  const clamp = (value: number) =>
    Math.min(Math.max(Math.trunc(value) || 1, 1), pricing.max_quantity);

  const price = (amount: number) => formatPrice(amount, pricing.currency);
  const total = price(quantity * pricing.price_per_interview);

  return (
    <>
      <form
        noValidate
        id="buy-interviews"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          checkout(quantity);
        }}
      >
        <Field>
          <FieldLabel htmlFor="quantity">How many?</FieldLabel>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={quantity <= 1}
              onClick={() => setQuantity(clamp(quantity - 1))}
            >
              <Minus />
              <span className="sr-only">One fewer</span>
            </Button>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={pricing.max_quantity}
              value={quantity}
              onChange={(e) => setQuantity(clamp(e.target.valueAsNumber))}
              className="w-20 text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={quantity >= pricing.max_quantity}
              onClick={() => setQuantity(clamp(quantity + 1))}
            >
              <Plus />
              <span className="sr-only">One more</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.filter((preset) => preset <= pricing.max_quantity).map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={quantity === preset}
                  onClick={() => setQuantity(preset)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-sm text-muted-foreground transition-colors outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    quantity === preset &&
                      "border-primary bg-primary text-primary-foreground hover:border-primary",
                  )}
                >
                  {preset}
                </button>
              ),
            )}
          </div>
        </Field>

        <dl className="flex items-baseline justify-between border-t pt-4 text-sm">
          <dt className="text-muted-foreground">
            {pluralize(quantity)} × {price(pricing.price_per_interview)}
          </dt>
          <dd className="font-mono text-lg font-medium tabular-nums">
            {total}
          </dd>
        </dl>
      </form>

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          You'll finish paying on Stripe.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="buy-interviews" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Pay {total}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
