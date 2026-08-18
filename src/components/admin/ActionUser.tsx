import { useState } from "react";
import { DeleteIcon, EditIcon, ThreeDotIcon } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
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
import { deleteDataUser, editDataUser } from "#/lib/server-functions";
import { useInvalidateData } from "#/lib/useInvalidate";

export interface ActionUserData {
	id: number;
	nama: string;
}

export default function ActionUser({ data }: { data: ActionUserData }) {
	const [loading, setLoading] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [nama, setNama] = useState(data.nama);
	const invalidate = useInvalidateData();

	const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		try {
			await editDataUser({ data: { _id: data.id, nama } });
			invalidate();
			setEditOpen(false);
		} catch {
			alert("Data gagal diperbarui.");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		try {
			await deleteDataUser({ data: { _id: data.id } });
			invalidate();
			setDeleteOpen(false);
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
					aria-label={`Aksi untuk ${data.nama}`}
					className="p-0"
					variant="outline"
					size="icon-sm"
				>
					<ThreeDotIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem
					onClick={() => {
						setNama(data.nama);
						setEditOpen(true);
					}}
				>
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
				<DialogContent className="sm:max-w-106.25">
					<form onSubmit={handleEdit}>
						<DialogHeader>
							<DialogTitle>Edit User</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<Input
								required
								value={nama}
								onChange={(e) => setNama(e.target.value)}
								placeholder="Nama User"
							/>
						</div>
						<DialogFooter className="grid grid-cols-2 gap-2">
							<DialogClose asChild>
								<Button type="button" variant="outline" className="w-full">
									Batal
								</Button>
							</DialogClose>
							<Button disabled={loading} className="w-full" type="submit">
								Simpan
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent className="sm:max-w-106.25">
					<DialogHeader>
						<DialogTitle>Yakin ingin menghapus user berikut :</DialogTitle>
						<div className="flex items-center justify-center w-full gap-1 py-2">
							<div className="border py-1 w-full text-center rounded font-semibold">
								{data.nama}
							</div>
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
