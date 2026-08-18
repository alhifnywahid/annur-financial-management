import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { addTagihan } from "#/lib/server-functions";
import { useInvalidateData } from "#/lib/useInvalidate";

/**
 * Adds a bill to the current month. In the old app this was a
 * "Fitur belum tersedia!" stub; now fully implemented.
 */
export default function FormTagihan() {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const invalidate = useInvalidateData();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		const title = (e.currentTarget.elements[0] as HTMLInputElement).value;
		const nominal = (e.currentTarget.elements[1] as HTMLInputElement).value;
		try {
			await addTagihan({ data: { title, nominal } });
			setOpen(false);
			await invalidate();
		} catch {
			alert("Data gagal di tambahkan.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">Tambah Tagihan</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Tambah Tagihan</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<Input required placeholder="Nama Tagihan" />
						<Input required type="number" placeholder="Nominal" />
					</div>
					<DialogFooter className="grid grid-cols-2 gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" className="w-full">
								Batal
							</Button>
						</DialogClose>
						<Button disabled={loading} className="w-full" type="submit">
							Tambah
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
