import { useState } from "react";
import { DeleteIcon, EditIcon, ThreeDotIcon } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { deleteTransaksi, editTransaksi } from "#/lib/server-functions";
import { numberToIdr } from "#/lib/toIDR";
import { useInvalidateData } from "#/lib/useInvalidate";

export interface ActionTambahData {
	id: number;
	title: string;
	nominal: number;
	tanggal: string; // YYYY-MM-DD
	type: "pengeluaran" | "masukan";
}

export default function ActionTambah({ data }: { data: ActionTambahData }) {
	const [loading, setLoading] = useState(false);
	const [datas, setDatas] = useState(data);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const invalidate = useInvalidateData();

	const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		try {
			await editTransaksi({
				data: {
					_id: data.id,
					title: datas.title,
					nominal: datas.nominal,
					tanggal: datas.tanggal,
					type: data.type,
				},
			});
			setEditOpen(false);
			await invalidate();
		} catch {
			alert("Data gagal ditambahkan.");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		try {
			await deleteTransaksi({ data: { _id: data.id, type: data.type } });
			setDeleteOpen(false);
			await invalidate();
		} catch {
			alert("Data gagal dihapus.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={`Aksi untuk ${data.title}`}
					className="p-0"
					variant="outline"
				>
					<ThreeDotIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem onClick={() => setEditOpen(true)}>
					Edit
					<DropdownMenuShortcut>
						<EditIcon />
					</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setDeleteOpen(true)}>
					Hapus
					<DropdownMenuShortcut>
						<DeleteIcon />
					</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<form onSubmit={handleEdit}>
						<DialogHeader>
							<DialogTitle>Edit Data</DialogTitle>
							<DialogDescription>Edit data</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<Input
								required
								onChange={(e) => setDatas({ ...datas, title: e.target.value })}
								value={datas.title}
							/>
							<Input
								required
								type="number"
								onChange={(e) =>
									setDatas({ ...datas, nominal: Number(e.target.value) })
								}
								value={datas.nominal}
							/>
							<Input
								onChange={(e) =>
									setDatas({ ...datas, tanggal: e.target.value })
								}
								value={datas.tanggal}
								required
								type="date"
							/>
						</div>
						<DialogFooter className="grid grid-cols-2 gap-2">
							<DialogClose asChild>
								<Button type="button" variant="outline" className="w-full">
									Batal
								</Button>
							</DialogClose>
							<Button disabled={loading} className="w-full" type="submit">
								Edit
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Yakin ingin menghapus data berikut :</DialogTitle>
						<div className="flex items-center justify-between w-full gap-1 py-2 *:border *:py-1 *:w-full *:text-center *:rounded">
							<div>{datas.title}</div>
							<div>{numberToIdr(datas.nominal)}</div>
							<div>{datas.tanggal}</div>
						</div>
					</DialogHeader>
					<DialogFooter className="grid grid-cols-2 gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" className="w-full">
								Batal
							</Button>
						</DialogClose>
						<Button
							onClick={handleDelete}
							disabled={loading}
							className="w-full"
						>
							Hapus
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</DropdownMenu>
	);
}
