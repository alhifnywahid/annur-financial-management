import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { addDataUser } from "#/lib/server-functions";
import { useInvalidateData } from "#/lib/useInvalidate";

export default function FormTambahUser() {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const invalidate = useInvalidateData();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		const nama = (e.currentTarget.elements[0] as HTMLInputElement).value;
		try {
			await addDataUser({ data: { nama } });
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
				<Button variant="outline">Tambah User</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-106.25">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Tambah User</DialogTitle>
						<DialogDescription>Tambah data User</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<Input required placeholder="Nama User" />
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
