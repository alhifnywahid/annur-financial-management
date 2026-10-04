import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import ActionUser from "#/components/admin/ActionUser";
import FormTambahUser from "#/components/admin/FormTambahUser";
import { Accordion } from "#/components/ui/accordion";
import { ScrollArea } from "#/components/ui/scroll-area";
import { dataUserQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/admin/data-user")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(dataUserQueryOptions),
	component: DataUserPage,
});

function DataUserPage() {
	const { data: users } = useSuspenseQuery(dataUserQueryOptions);

	return (
		<div className="flex flex-col gap-2 h-full my-3">
			<ScrollArea className="h-full w-full rounded-md">
				<div>
					<Accordion
						type="single"
						collapsible
						className="w-full flex flex-col gap-2"
					>
						{users.map((v) => (
							<Fragment key={v._id}>
								<Card
									id={v._id}
									name={v.nama}
									nonaktifSejak={v.nonaktif_sejak}
								/>
							</Fragment>
						))}
					</Accordion>
				</div>
			</ScrollArea>
			<FormTambahUser />
		</div>
	);
}

function Card({
	id,
	name,
	nonaktifSejak,
}: {
	id: number;
	name: string;
	nonaktifSejak: string | null;
}) {
	return (
		<div className="flex items-center justify-between rounded-xl p-4 w-full bg-card card-soft transition-all">
			<h1 className="text-lg font-semibold flex items-center gap-2">
				{name}
				{nonaktifSejak && (
					<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-text-soft border">
						Nonaktif per {nonaktifSejak.slice(0, 7)}
					</span>
				)}
			</h1>
			<ActionUser data={{ id, nama: name, nonaktif_sejak: nonaktifSejak }} />
		</div>
	);
}
