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
								<Card id={v._id} name={v.nama} />
							</Fragment>
						))}
					</Accordion>
				</div>
			</ScrollArea>
			<FormTambahUser />
		</div>
	);
}

function Card({ id, name }: { id: number; name: string }) {
	return (
		<div className="flex items-center justify-between rounded-xl p-4 w-full bg-card card-soft transition-all">
			<h1 className="text-lg font-semibold">{name}</h1>
			<ActionUser data={{ id, nama: name }} />
		</div>
	);
}
