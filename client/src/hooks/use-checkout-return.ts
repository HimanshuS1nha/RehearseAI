import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ToastHelper } from "#/helpers/toast.helper";

import { QUERY_KEYS } from "#/constants/query-keys";

import { paymentQueryOptions } from "#/queries/billing.query";

const TOAST_ID = "checkout-return";
// How long to wait for Stripe's webhook to mark the payment paid.
const CONFIRM_TIMEOUT_MS = 60_000;

// Stripe sends the user back to the dashboard with the Checkout Session ID
// on success, or with checkout=canceled. Reports how it went, then calls
// onDone so the caller can drop the params from the URL.
export const useCheckoutReturn = ({
  sessionId,
  isCanceled,
  onDone,
}: {
  sessionId?: string;
  isCanceled: boolean;
  onDone: () => void;
}) => {
  const queryClient = useQueryClient();
  const [isTimedOut, setIsTimedOut] = useState(false);
  const { data: payment, isError } = useQuery({
    ...paymentQueryOptions(sessionId ?? ""),
    enabled: !!sessionId && !isTimedOut,
  });

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const timeout = setTimeout(() => setIsTimedOut(true), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [sessionId]);

  const status = payment?.status;
  const isStillPending = status === "pending" && isTimedOut;

  useEffect(() => {
    if (isCanceled) {
      ToastHelper.info("Checkout canceled, you weren't charged", TOAST_ID);
      onDone();
      return;
    }
    if (!sessionId) {
      return;
    }

    if (status === "paid") {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getUser] });
      ToastHelper.success(
        `${payment?.quantity} interview${payment?.quantity === 1 ? "" : "s"} added`,
        TOAST_ID,
      );
      onDone();
    } else if (status === "failed" || status === "expired") {
      ToastHelper.info("The payment didn't go through", TOAST_ID);
      onDone();
    } else if (isStillPending) {
      // Slow bank methods can take a while; the webhook will still add them.
      ToastHelper.info(
        "Your payment is still processing. The interviews will show up once it clears.",
        TOAST_ID,
      );
      onDone();
    } else if (isError) {
      ToastHelper.info(
        "Couldn't check on your payment. If you were charged, the interviews will show up shortly.",
        TOAST_ID,
      );
      onDone();
    } else {
      ToastHelper.loading("Confirming your payment…", TOAST_ID);
    }
  }, [
    isCanceled,
    sessionId,
    status,
    isStillPending,
    isError,
    payment?.quantity,
    queryClient,
    onDone,
  ]);
};
