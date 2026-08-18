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
import { addTransaksi } from "#/lib/server-functions";
import { useInvalidateData } from "#/lib/useInvalidate";

function todayInput() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function FormTambah({
	type,
}: {
	type: "pengeluaran" | "masukan";
}) {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [date, setDate] = useState(todayInput());
	const invalidate = useInvalidateData();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		const form = e.currentTarget;
		const title = (form.elements[0] as HTMLInputElement).value;
		const nominal = (form.elements[1] as HTMLInputElement).value;
		const tanggal = (form.elements[2] as HTMLInputElement).value;
		try {
			await addTransaksi({ data: { type, title, nominal, tanggal } });
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
				<Button variant="outline">
					{type === "pengeluaran" ? "Tambah Pengeluaran" : "Tambah Pemasukan"}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{type === "pengeluaran"
								? "Tambah Pengeluaran"
								: "Tambah Pemasukan"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<Input
							required
							placeholder={
								type === "pengeluaran" ? "Jenis Pengeluaran" : "Jenis Pemasukan"
							}
						/>
						<Input required type="number" placeholder="Nominal" />
						<Input
							onChange={(e) => setDate(e.target.value)}
							value={date}
							required
							type="date"
							placeholder="Pilih Tanggal"
						/>
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
