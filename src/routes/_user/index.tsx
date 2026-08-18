import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";

import { ScrollArea } from "#/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { formatDDMMYYYYShort } from "#/lib/date";
import { dataBulananQueryOptions } from "#/lib/queries";
import { numberToIdr } from "#/lib/toIDR";
import type { TransaksiDTO } from "#/lib/types";

export const Route = createFileRoute("/_user/")({
	component: Home,
});

const PENGELUARAN = "Pengeluaran";
const MASUKAN = "Pemasukan";

function Home() {
	const { data } = useSuspenseQuery(dataBulananQueryOptions);
	const { dataPengeluaran, dataPemasukan, totalSaldo } = data;

	return (
		<main className="flex h-full w-full flex-col overflow-hidden">
			<div className="flex flex-col gap-3 h-full">
				<CardHome totalSaldo={totalSaldo} />
				<h1 className="text-lg font-semibold mt-2">
					Uang Masuk & Keluar Tambahan.
				</h1>
				<Tabs
					defaultValue={PENGELUARAN}
					className="h-full flex flex-col overflow-hidden"
				>
					<TabsList className="*:w-full w-full">
						<TabsTrigger value={PENGELUARAN}>{PENGELUARAN}</TabsTrigger>
						<TabsTrigger value={MASUKAN}>{MASUKAN}</TabsTrigger>
					</TabsList>
					<TabsContent className="h-full overflow-hidden" value={PENGELUARAN}>
						<div className="flex flex-col gap-2 h-full overflow-hidden">
							<DataContent data={dataPengeluaran} />
						</div>
					</TabsContent>
					<TabsContent className="h-full overflow-hidden" value={MASUKAN}>
						<div className="flex flex-col gap-2 h-full overflow-hidden">
							<DataContent data={dataPemasukan} />
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</main>
	);
}

function CardHome({ totalSaldo }: { totalSaldo: number }) {
	return (
		<div className="flex items-center justify-between rounded-xl p-5 w-full bg-house text-white card-soft">
			<div className="flex flex-col gap-1">
				<h1 className="text-lg font-semibold">Total Saldo</h1>
				<p className="text-sm text-white/70">Total Saldo yang tersedia</p>
			</div>
			<p className="text-xl font-bold">{numberToIdr(totalSaldo)}</p>
		</div>
	);
}

function DataContent({ data }: { data: TransaksiDTO[] }) {
	return (
		<ScrollArea className="h-full w-full rounded-xl border bg-card card-soft">
			<div className="p-4">
				<table className="w-full">
					<tbody>
						{[...data].reverse().map((item, i) => (
							<Fragment key={item._id}>
								<tr className="*:py-1 border-b border-border last:border-0">
									<td className="text-center text-text-soft">{i + 1}.</td>
									<td>{item.title}</td>
									<td className="text-center font-medium">
										{numberToIdr(item.nominal).replace(",00", "")}
									</td>
									<td className="text-center text-text-soft">
										{formatDDMMYYYYShort(item.tanggal)}
									</td>
								</tr>
							</Fragment>
						))}
					</tbody>
				</table>
			</div>
		</ScrollArea>
	);
}
