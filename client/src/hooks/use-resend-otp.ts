import { useMutation } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";

export const useResendOtp = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (email: string) => {
      const { data } = await axios.post<MessageResponseType>(
        API_ROUTES.auth.resendVerification,
        { email },
      );

      return data;
    },
    onSuccess: (data) => ToastHelper.success(data.message),
    onError: ToastHelper.error,
  });

  return { resendOtp: mutate, isPending };
};
