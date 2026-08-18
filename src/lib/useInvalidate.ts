import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

/**
 * Returns a callback that refreshes the financial data after a mutation.
 *
 * IMPORTANT: invalidation is fired without `await`. `invalidateQueries`
 * returns a promise that only resolves once the triggered refetch completes,
 * and awaiting it inside a dialog's async click handler can stall (the refetch
 * promise never settles in this SSR + suspense-query setup), which previously
 * blocked the UI from updating. Marking the queries stale synchronously is
 * enough — the active `useSuspenseQuery` observers refetch and re-render on
 * their own. We intentionally do not await here.
 */
export function useInvalidateData() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return () => {
		void queryClient.invalidateQueries({ queryKey: ["data-bulanan"] });
		void queryClient.invalidateQueries({ queryKey: ["data-user"] });
		// Refresh route loaders too (non-blocking) so SSR-hydrated data stays fresh.
		void router.invalidate();
	};
}
