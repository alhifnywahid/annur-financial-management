import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import ActionTambah from "#/components/admin/ActionTambah";
import FormTambah from "#/components/admin/FormTambah";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { formatDDMMYYYYShort } from "#/lib/date";
import { dataBulananQueryOptions } from "#/lib/queries";
import { numberToIdr } from "#/lib/toIDR";
import type { TransaksiDTO } from "#/lib/types";

export const Route = createFileRoute("/admin/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(dataBulananQueryOptions),
	component: AdminHome,
});

const PENGELUARAN = "Pengeluaran";
const MASUKAN = "Masukan";

function AdminHome() {
	const { data } = useSuspenseQuery(dataBulananQueryOptions);
	const { dataPengeluaran, dataPemasukan } = data;

	return (
		<Tabs
			defaultValue={PENGELUARAN}
			className="h-full mt-2 flex flex-col overflow-hidden"
		>
			<TabsList className="*:w-full w-full">
				<TabsTrigger value={PENGELUARAN}>{PENGELUARAN}</TabsTrigger>
				<TabsTrigger value={MASUKAN}>{MASUKAN}</TabsTrigger>
			</TabsList>
			<TabsContent className="h-full overflow-hidden" value={PENGELUARAN}>
				<div className="flex flex-col gap-2 h-full overflow-hidden">
					<DataContent data={dataPengeluaran} type="pengeluaran" />
					<FormTambah type="pengeluaran" />
				</div>
			</TabsContent>
			<TabsContent className="h-full overflow-hidden" value={MASUKAN}>
				<div className="flex flex-col gap-2 h-full overflow-hidden">
					<DataContent data={dataPemasukan} type="masukan" />
					<FormTambah type="masukan" />
				</div>
			</TabsContent>
		</Tabs>
	);
}

function DataContent({
	data,
	type,
}: {
	data: TransaksiDTO[];
	type: "pengeluaran" | "masukan";
}) {
	/** "DDMMYYYY" -> "YYYY-MM-DD" for the edit date input. */
	const toDateInput = (v: string) =>
		`${v.slice(4, 8)}-${v.slice(2, 4)}-${v.slice(0, 2)}`;

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
									<td>
										<ActionTambah
											data={{
												id: item._id,
												title: item.title,
												nominal: item.nominal,
												tanggal: toDateInput(item.tanggal),
												type,
											}}
										/>
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
