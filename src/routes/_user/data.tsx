import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import CardUser from "#/components/CardUser";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#/components/ui/accordion";
import { ScrollArea } from "#/components/ui/scroll-area";
import { formatMonthYear } from "#/lib/date";
import { dataBulananQueryOptions } from "#/lib/queries";
import { hitungTagihanUser } from "#/lib/tagihan";
import type { DataBulananDTO } from "#/lib/types";

export const Route = createFileRoute("/_user/data")({
	component: DataPage,
});

function DataPage() {
	const { data } = useSuspenseQuery(dataBulananQueryOptions);

	return (
		<main className="flex h-full w-full flex-col overflow-hidden">
			<div className="flex flex-col gap-3 h-full">
				<ScrollArea className="h-full w-full rounded-md">
					<div>
						<Accordion type="single" collapsible className="w-full">
							{data.dataBulanan.map((bulan, i) => (
								<Fragment key={bulan._id}>
									<DataAccordion data={bulan} i={i} />
								</Fragment>
							))}
						</Accordion>
					</div>
				</ScrollArea>
			</div>
		</main>
	);
}

function DataAccordion({ data, i }: { data: DataBulananDTO; i: number }) {
	const { user, pembayaran } = data;
	// The month is green only when EVERY member has settled. Summing the whole
	// month first (the previous approach) let one member's overpayment mask
	// another member's shortfall and turn the header green while debt remained.
	const isHaveNotPaid = user.some(
		(u) =>
			!hitungTagihanUser({
				bills: pembayaran,
				dendaCount: u.denda.length,
				totalBayar: u.total_bayar,
			}).isLunas,
	);
	const monthNow = formatMonthYear(data.tanggal);

	return (
		<AccordionItem value={`item-${i + 1}`} className="w-full">
			<AccordionTrigger
				className={isHaveNotPaid ? "text-danger" : "text-sb-green"}
			>
				{monthNow}
			</AccordionTrigger>
			<AccordionContent>
				<div className="flex flex-col gap-2">
					{user.map((u) => (
						<Fragment key={u._id}>
							<CardUser bulan={data} user={u} />
						</Fragment>
					))}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
