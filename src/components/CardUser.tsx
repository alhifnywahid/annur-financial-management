import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "#/components/ui/table";
import { formatMonthName, formatMonthYear } from "#/lib/date";
import { DENDA_PER_BULAN, hitungTagihanUser } from "#/lib/tagihan";
import { numberToIdr } from "#/lib/toIDR";
import type { BulananUserDTO, DataBulananDTO } from "#/lib/types";

export default function CardUser({
	bulan,
	user,
}: {
	bulan: DataBulananDTO;
	user: BulananUserDTO;
}) {
	const { nama, total_bayar, denda } = user;
	const { tanggal, pembayaran } = bulan;

	const [open, setOpen] = useState(false);
	// Single source of truth for the settlement rule — see src/lib/tagihan.ts.
	const {
		tagihan: price,
		owed: totalPembayaran,
		kurang,
		isLunas,
	} = hitungTagihanUser({
		bills: pembayaran,
		dendaCount: denda.length,
		totalBayar: total_bayar,
	});
	const date = formatMonthYear(tanggal);
	const isLate = denda.length > 0;

	return (
		<Dialog open={!isLunas && open} onOpenChange={setOpen}>
			{/*
			 * A real <button> rather than a div with onClick: the card is the only
			 * way into the detail dialog, so it has to be reachable by keyboard and
			 * announced as a control. (Hence <span> for the name — a <button> may
			 * only contain phrasing content, not a heading.)
			 */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={`flex items-center justify-between rounded-xl p-4 w-full text-left bg-card card-soft cursor-pointer transition-all border-l-4 ${
					isLunas ? "border-l-accent-green" : "border-l-danger"
				}`}
			>
				<span className="text-lg font-semibold">{nama}</span>
				<span className="flex flex-col items-end justify-center">
					<span
						className={`text-lg font-semibold ${
							isLunas ? "text-accent-green" : "text-danger"
						}`}
					>
						{isLunas ? "Lunas" : `- ${numberToIdr(kurang)}`}
					</span>
					{isLate && (
						<span className="text-sm text-danger">
							Terlambat {denda.length} Bulan
						</span>
					)}
				</span>
			</button>
			<DialogContent className="max-w-[400px] sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>
						{nama} - {date}
					</DialogTitle>
				</DialogHeader>
				<DataTable
					nowMonth={price}
					price={totalPembayaran}
					bayar={total_bayar}
					kurang={kurang}
					denda={denda}
				/>
				<DialogFooter>
					<Button onClick={() => setOpen(false)} className="w-full">
						Kembali
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DataTable({
	price,
	denda,
	bayar,
	kurang,
	nowMonth,
}: {
	price: number;
	denda: string[];
	bayar: number;
	kurang: number;
	nowMonth: number;
}) {
	return (
		<Table className="w-full">
			<TableBody>
				<TRow cell1="Pembayaran" cell2={numberToIdr(nowMonth)} isBold={false} />
				{denda.map((d) => (
					<TRow
						key={d}
						cell1={`Denda ${formatMonthName(d)}`}
						cell2={numberToIdr(DENDA_PER_BULAN)}
						isBold={false}
					/>
				))}
				<TRow cell1="Total Tagihan" cell2={numberToIdr(price)} />
				<TRow cell1="Telah dibayar" color="green" cell2={numberToIdr(bayar)} />
				<TRow
					cell1="Pembayaran Kurang"
					color="red"
					cell2={numberToIdr(kurang)}
				/>
			</TableBody>
		</Table>
	);
}

function TRow({
	cell1,
	cell2,
	color = "red",
	isBold = true,
}: {
	cell1: string;
	cell2: string;
	color?: "red" | "green";
	isBold?: boolean;
}) {
	const colorClass = color === "green" ? "text-accent-green" : "text-danger";
	return (
		<TableRow className={`${isBold ? "font-bold" : ""} ${colorClass}`}>
			<TableCell>{cell1}</TableCell>
			<TableCell className="text-right">{cell2}</TableCell>
		</TableRow>
	);
}
