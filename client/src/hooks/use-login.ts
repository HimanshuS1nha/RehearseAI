import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AxiosError } from "axios";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

import type { LoginValidatorType } from "#/validators/login.validator";

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: LoginValidatorType) =>
      axios.post(API_ROUTES.auth.login, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getUser] });
      ToastHelper.success("Logged in");
      navigate({ to: "/dashboard" });
    },
    onError: (error, { email }) => {
      ToastHelper.error(error);
      // 403 means the email isn't verified yet. The server has just sent a
      // fresh code, so take the user straight to where they enter it.
      if (error instanceof AxiosError && error.response?.status === 403) {
        navigate({ to: "/verify-otp", search: { email } });
      }
    },
  });

  return { login: mutate, isPending };
};
