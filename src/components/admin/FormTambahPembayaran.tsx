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
import { addPayment } from "#/lib/server-functions";
import { numberToIdr } from "#/lib/toIDR";
import { useInvalidateData } from "#/lib/useInvalidate";

export default function FormTambahPembayaran(props: {
  name: string;
  tanggal: string; // "MMYYYY"
  price: string;
  max: number;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateData();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const nominal = (e.currentTarget.elements[0] as HTMLInputElement).value;
    try {
      await addPayment({
        data: { nominal, tanggal: props.tanggal, user: props.name },
      });
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
        <div className="flex items-center justify-between rounded-xl p-4 w-full bg-card card-soft cursor-pointer transition-all border-l-4 border-l-danger active:scale-[0.99]">
          <h1 className="text-lg font-semibold">{props.name}</h1>
          <p className="text-lg font-semibold text-danger">{props.price}</p>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran {props.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="number"
              required
              placeholder={`Nominal Pembayaran Max ${numberToIdr(props.max)}`}
              min={0}
              max={props.max}
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
