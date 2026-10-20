import { queryOptions } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import type { PaymentType, PricingType } from "#/types";

export const pricingQueryOptions = queryOptions({
  queryKey: [QUERY_KEYS.getPricing],
  queryFn: async () => {
    const { data } = await axios.get<PricingType>(API_ROUTES.billing.pricing);

    return data;
  },
  // Only changes with a deploy.
  staleTime: Infinity,
});

// The payment stays pending until Stripe's webhook reaches the server, which
// can land a moment after Stripe sends the user back, so keep checking.
export const paymentQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: [QUERY_KEYS.getPayment, sessionId],
    queryFn: async () => {
      const { data } = await axios.get<PaymentType>(
        API_ROUTES.billing.payment(sessionId),
      );

      return data;
    },
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 2000 : false,
  });
