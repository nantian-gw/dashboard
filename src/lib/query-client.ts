import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 1000,
        retry: 2,
        refetchOnWindowFocus: true,
      },
    },
  });
}