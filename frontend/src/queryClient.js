import { QueryClient } from '@tanstack/react-query';

// Cached data is shown instantly on revisit and silently refetched in the
// background once stale, instead of every page navigation re-fetching from
// scratch and showing a loading flash. A minute is long enough to smooth
// over normal back-and-forth navigation, short enough that other family
// members' changes still show up quickly.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});
