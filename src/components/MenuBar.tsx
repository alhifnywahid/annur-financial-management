import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CiViewList } from "react-icons/ci";
import { IoHomeOutline } from "react-icons/io5";
import { MdPayment } from "react-icons/md";
import { TbCreditCardPay } from "react-icons/tb";

interface MenuLink {
	title: string;
	link: string;
	icon: ReactNode;
}

const linksUser: MenuLink[] = [
	{ title: "Home", link: "/", icon: <IoHomeOutline size={30} /> },
	{ title: "Data", link: "/data", icon: <CiViewList size={30} /> },
	{ title: "Hutang", link: "/hutang", icon: <TbCreditCardPay size={30} /> },
	{ title: "Bayar", link: "/bayar", icon: <MdPayment size={30} /> },
];

const linksAdmin: MenuLink[] = [
	{ title: "Home", link: "/admin", icon: <IoHomeOutline size={30} /> },
	{ title: "User", link: "/admin/data-user", icon: <CiViewList size={30} /> },
	{
		title: "Pembayaran",
		link: "/admin/data-pembayaran",
		icon: <TbCreditCardPay size={30} />,
	},
	{ title: "Tagihan", link: "/admin/tagihan", icon: <MdPayment size={30} /> },
];

export default function MenuBar() {
	const [size, setSize] = useState<string | null>(null);
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	useEffect(() => {
		const userAgent = navigator.userAgent;
		const isMobile = /iPhone|iPad|Android|Windows Phone/i.test(userAgent);
		setSize(isMobile ? "w-screen" : "w-[32rem]");
	}, []);

	if (!size) return null;

	const links = pathname.includes("admin") ? linksAdmin : linksUser;

	return (
		<div
			className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 grid grid-cols-4 gap-3 items-center justify-between px-4 ${size} bg-house text-white rounded-t-2xl nav-soft`}
		>
			{links.map((link) => (
				<Link
					key={link.link}
					to={link.link}
					activeOptions={{ exact: link.link === "/" || link.link === "/admin" }}
					className="p-2 flex gap-1 flex-col items-center justify-center text-white/70 transition-colors hover:text-white data-[status=active]:text-white"
				>
					{link.icon}
					<p className="text-xs">{link.title}</p>
				</Link>
			))}
		</div>
	);
}
