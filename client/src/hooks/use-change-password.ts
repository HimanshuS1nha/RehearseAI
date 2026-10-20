import { useMutation } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";
import type { ChangePasswordValidatorType } from "#/validators/change-password.validator";

export const useChangePassword = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
      confirmNewPassword,
    }: ChangePasswordValidatorType) => {
      const { data } = await axios.post<MessageResponseType>(
        API_ROUTES.auth.changePassword,
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        },
      );

      return data;
    },
    onSuccess: (data) => ToastHelper.success(data.message),
    onError: ToastHelper.error,
  });

  return { changePassword: mutate, isPending };
};
