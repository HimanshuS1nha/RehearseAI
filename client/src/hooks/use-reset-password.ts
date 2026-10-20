import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";
import type { ResetPasswordValidatorType } from "#/validators/reset-password.validator";

export const useResetPassword = () => {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      email,
      code,
      newPassword,
      confirmNewPassword,
    }: ResetPasswordValidatorType & { email: string }) => {
      const { data } = await axios.post<MessageResponseType>(
        API_ROUTES.auth.resetPassword,
        {
          email,
          code,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        },
      );

      return data;
    },
    onSuccess: (data) => {
      // Resetting logs out every session, so the user logs in fresh.
      ToastHelper.success(data.message);
      navigate({ to: "/login" });
    },
    onError: ToastHelper.error,
  });

  return { resetPassword: mutate, isPending };
};
