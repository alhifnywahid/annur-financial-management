import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import ButtonCopyInfo from "#/components/admin/ButtonCopyInfo";
import FormTambahPembayaran from "#/components/admin/FormTambahPembayaran";
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
import { numberToIdr } from "#/lib/toIDR";
import type { DataBulananDTO } from "#/lib/types";

export const Route = createFileRoute("/admin/data-pembayaran")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(dataBulananQueryOptions),
	component: DataPembayaranPage,
});

function DataPembayaranPage() {
	const { data } = useSuspenseQuery(dataBulananQueryOptions);
	const months = getUnpaidMonths(data.dataBulanan);

	return (
		// `overflow-hidden` di wrapper + di ScrollArea adalah yang membuat tombol
		// Copy Info tetap terlihat: tanpa itu daftar bulan yang panjang mendorong
		// tombol keluar layar (CSS Flexbox 4.5, lihat catatan di scroll-area.tsx).
		<div className="flex flex-col gap-2 h-full my-3 overflow-hidden">
			<ScrollArea className="h-full w-full rounded-md">
				<div className="p-4">
					<Accordion type="single" collapsible className="w-full">
						{months.map((bulan, i) => (
							<Fragment key={bulan.tanggal}>
								<AccordionItem value={`item-${i + 1}`} className="w-full">
									<AccordionTrigger className="text-sb-green">
										{formatMonthYear(bulan.tanggal)}
									</AccordionTrigger>
									<AccordionContent>
										<div className="flex flex-col gap-2">
											{bulan.unpaidUsers.map((user) => (
												<FormTambahPembayaran
													key={user._id}
													max={user.kurang}
													name={user.nama}
													tanggal={bulan.tanggal}
													price={`- ${numberToIdr(user.kurang)}`}
												/>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>
							</Fragment>
						))}
					</Accordion>
				</div>
			</ScrollArea>
			<ButtonCopyInfo months={months} />
		</div>
	);
}

/**
 * Months that still have at least one member owing money, each unpaid member
 * annotated with the remaining shortfall.
 *
 * Outstanding-ness comes from the shared rule in `src/lib/tagihan.ts`, which
 * judges settlement on the month's bill — the same test this page used before,
 * now shared with the member cards and the Hutang page instead of re-derived
 * here. `kurang` includes denda, so the amount offered to the admin covers the
 * shortfall plus the penalty.
 */
function getUnpaidMonths(data: DataBulananDTO[]) {
	return data
		.map((month) => {
			const unpaidUsers = month.user
				.map((user) => ({
					...user,
					...hitungTagihanUser({
						bills: month.pembayaran,
						dendaCount: user.denda.length,
						totalBayar: user.total_bayar,
					}),
				}))
				.filter((user) => !user.isLunas);

			if (unpaidUsers.length === 0) return null;
			return { tanggal: month.tanggal, unpaidUsers };
		})
		.filter((v): v is NonNullable<typeof v> => v !== null);
}
