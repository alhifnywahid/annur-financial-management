import { Link } from "@tanstack/react-router";

import web from "#/lib/config";
import { todayLong } from "#/lib/date";

export default function Header() {
	return (
		<div className="gap-3 items-center justify-between p-5 w-full bg-house text-white nav-soft flex">
			<Link to="/" className="font-semibold text-lg">
				{web.title}
			</Link>
			<Link to="/admin" className="font-semibold text-sm">
				{todayLong()}
			</Link>
		</div>
	);
}
