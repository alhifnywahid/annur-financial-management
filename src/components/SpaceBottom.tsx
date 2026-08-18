import type { ReactNode } from "react";
import { CiViewList } from "react-icons/ci";
import { IoHomeOutline } from "react-icons/io5";
import { MdPayment } from "react-icons/md";
import { TbCreditCardPay } from "react-icons/tb";

const links: Array<{ title: string; icon: ReactNode }> = [
	{ title: "Home", icon: <IoHomeOutline size={30} /> },
	{ title: "Data", icon: <CiViewList size={30} /> },
	{ title: "Hutang", icon: <TbCreditCardPay size={30} /> },
	{ title: "Bayar", icon: <MdPayment size={30} /> },
];

/** Invisible spacer matching the fixed MenuBar height. */
export default function SpaceBottom() {
	return (
		<div className="grid grid-cols-4 gap-3 items-center justify-between px-4 opacity-0">
			{links.map((link) => (
				<h1
					key={link.title}
					className="p-2 flex gap-1 flex-col items-center justify-center"
				>
					{link.icon}
					<p className="text-xs">{link.title}</p>
				</h1>
			))}
		</div>
	);
}
