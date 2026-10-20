import { useMutation } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { CheckoutResponseType } from "#/types";

export const useCheckout = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (quantity: number) => {
      const { data } = await axios.post<CheckoutResponseType>(
        API_ROUTES.billing.checkout,
        { quantity },
      );

      return data;
    },
    onSuccess: (data) => {
      window.location.assign(data.checkout_url);
      // Never settles, so the button stays busy while the browser leaves for
      // Stripe instead of flicking back to clickable.
      return new Promise<never>(() => {});
    },
    onError: ToastHelper.error,
  });

  return { checkout: mutate, isPending };
};
