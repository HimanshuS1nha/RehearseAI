import { useQuery } from "@tanstack/react-query";

import { userQueryOptions } from "#/queries/user.query";

export const useUser = () => {
  const { data, isPending, error } = useQuery(userQueryOptions);

  return { user: data, isPending, error };
};
