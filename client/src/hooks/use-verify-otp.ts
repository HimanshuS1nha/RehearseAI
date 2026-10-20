import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";

export const useVerifyOtp = () => {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: { email: string; code: string }) => {
      const { data } = await axios.post<MessageResponseType>(
        API_ROUTES.auth.verifyEmail,
        values,
      );

      return data;
    },
    onSuccess: (data) => {
      // Verifying doesn't start a session, so the user logs in next.
      ToastHelper.success(data.message);
      navigate({ to: "/login" });
    },
    onError: ToastHelper.error,
  });

  return { verifyOtp: mutate, isPending };
};
