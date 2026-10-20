import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { RegisterValidatorType } from "#/validators/register.validator";

export const useRegister = () => {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ confirmPassword, ...values }: RegisterValidatorType) =>
      axios.post(API_ROUTES.auth.register, {
        ...values,
        confirm_password: confirmPassword,
      }),
    onSuccess: (_, { email }) => {
      ToastHelper.success("Account created. Check your email for a code");
      navigate({ to: "/verify-otp", search: { email } });
    },
    onError: ToastHelper.error,
  });

  return { register: mutate, isPending };
};
