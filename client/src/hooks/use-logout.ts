import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: () => axios.post(API_ROUTES.auth.logout),
    onSuccess: async () => {
      // Leave first, so a dashboard on screen doesn't refetch what's cleared.
      await navigate({ to: "/" });
      // Drop every cached query, interviews included, not just the user.
      queryClient.clear();
      ToastHelper.success("Logged out");
    },
    onError: ToastHelper.error,
  });

  return { logout: mutate, isPending };
};
