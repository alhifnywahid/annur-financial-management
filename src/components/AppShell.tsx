import type { ReactNode } from "react";

import Header from "./Header";
import MenuBar from "./MenuBar";
import SpaceBottom from "./SpaceBottom";

/**
 * Shared mobile-style shell used by both the user and admin sections.
 * Ported from the old (user)/layout.jsx and admin/layout.jsx.
 */
export default function AppShell({ children }: { children: ReactNode }) {
	return (
		<main className="relative max-w-lg mx-auto bg-card card-soft h-screen flex flex-col overflow-hidden">
			<Header />
			<div className="flex h-full w-full flex-col gap-3 p-4 pb-0 overflow-hidden">
				{children}
				<SpaceBottom />
			</div>
			<MenuBar />
		</main>
	);
}
