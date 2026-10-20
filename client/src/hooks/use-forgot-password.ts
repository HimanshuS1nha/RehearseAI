import { useMutation } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";

// Sends the reset code. Also used to resend it from the reset page.
export const useForgotPassword = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (email: string) => {
      const { data } = await axios.post<MessageResponseType>(
        API_ROUTES.auth.forgotPassword,
        { email },
      );

      return data;
    },
    onSuccess: (data) => ToastHelper.success(data.message),
    onError: ToastHelper.error,
  });

  return { sendResetCode: mutate, isPending };
};
