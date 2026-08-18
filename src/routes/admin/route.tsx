import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import AppShell from "#/components/AppShell";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { getAdminSession } from "#/lib/server-functions";

export const Route = createFileRoute("/admin")({
	loader: () => getAdminSession(),
	component: AdminLayout,
});

function AdminLayout() {
	const initial = Route.useLoaderData();
	const { data: session } = useQuery({
		queryKey: ["admin-session"],
		queryFn: () => getAdminSession(),
		initialData: initial,
	});

	if (!session?.authed) {
		return (
			<div className="w-screen h-screen flex flex-col gap-6 items-center justify-center bg-cream px-6 text-center">
				<h1 className="text-2xl font-bold text-sb-green">{`Annur Official`}</h1>
				<p className="text-text-soft -mt-2">Panel Admin</p>
				<Button
					type="button"
					size="lg"
					onClick={() =>
						authClient.signIn.social({
							provider: "google",
							callbackURL: "/admin",
						})
					}
				>
					Login Dulu Bro!
				</Button>
			</div>
		);
	}

	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
