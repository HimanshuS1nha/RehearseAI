import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";

import type { MessageResponseType } from "#/types";
import type { DeleteAccountValidatorType } from "#/validators/delete-account.validator";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: DeleteAccountValidatorType) => {
      const { data } = await axios.delete<MessageResponseType>(
        API_ROUTES.auth.deleteAccount,
        { data: values },
      );

      return data;
    },
    onSuccess: async (data) => {
      // Same order as logging out: leave the guarded pages first, then drop
      // everything cached for the deleted account.
      await navigate({ to: "/" });
      queryClient.clear();
      ToastHelper.success(data.message);
    },
    onError: ToastHelper.error,
  });

  return { deleteAccount: mutate, isPending };
};
