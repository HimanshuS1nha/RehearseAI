import { useMutation, useQueryClient } from "@tanstack/react-query";

import { axios } from "#/lib/axios";

import { ToastHelper } from "#/helpers/toast.helper";

import { API_ROUTES } from "#/constants/api-routes";
import { QUERY_KEYS } from "#/constants/query-keys";

export const useDeleteInterview = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(API_ROUTES.interviews.delete(id));
    },
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.getInterview, id] });
      queryClient.removeQueries({
        queryKey: [QUERY_KEYS.getInterviewResults, id],
      });
      // An interview deleted before it started gives its credit back, so the
      // user's count may have gone up.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getInterviews] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.getUser] }),
      ]);
      ToastHelper.success("Interview deleted");
    },
    onError: ToastHelper.error,
  });

  return { deleteInterview: mutate, isPending };
};
