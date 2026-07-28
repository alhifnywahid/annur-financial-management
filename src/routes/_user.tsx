import { Outlet, createFileRoute } from "@tanstack/react-router";

import AppShell from "#/components/AppShell";
import { dataBulananQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/_user")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dataBulananQueryOptions),
  component: UserLayout,
});

function UserLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
