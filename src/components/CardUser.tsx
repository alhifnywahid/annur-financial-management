import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "#/components/ui/table";
import { formatMonthName, formatMonthYear } from "#/lib/date";
import { numberToIdr } from "#/lib/toIDR";
import type { BulananUserDTO, DataBulananDTO } from "#/lib/types";

export default function CardUser({
  bulan,
  user,
}: {
  bulan: DataBulananDTO;
  user: BulananUserDTO;
}) {
  const { nama, total_bayar, denda } = user;
  const { tanggal, pembayaran } = bulan;

  const [open, setOpen] = useState(false);
  const price = pembayaran.reduce((a, b) => a + b.nominal, 0);
  const totalPembayaran = price + denda.length * 10000;
  // Lunas when the member has paid at least the total owed (bill + any denda).
  // Using >= (not ===) keeps overpayers as "Lunas" and the shortfall non-negative,
  // matching the authoritative /admin/data-pembayaran definition.
  const ifSome = total_bayar >= totalPembayaran;
  const date = formatMonthYear(tanggal);
  const isLate = denda.length > 0;

  return (
    <Dialog open={!ifSome && open} onOpenChange={setOpen}>
      <div
        onClick={() => setOpen(true)}
        className={`flex items-center justify-between rounded-xl p-4 w-full bg-card card-soft cursor-pointer transition-all border-l-4 ${
          ifSome ? "border-l-accent-green" : "border-l-danger"
        }`}
      >
        <h1 className="text-lg font-semibold">{nama}</h1>
        <div className="flex flex-col items-end justify-center">
          <p
            className={`text-lg font-semibold ${
              ifSome ? "text-accent-green" : "text-danger"
            }`}
          >
            {ifSome
              ? "Lunas"
              : `- ${numberToIdr(totalPembayaran - total_bayar)}`}
          </p>
          {isLate && (
            <p className="text-sm text-danger">
              Terlambat {denda.length} Bulan
            </p>
          )}
        </div>
      </div>
      <DialogContent className="max-w-[400px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {nama} - {date}
          </DialogTitle>
        </DialogHeader>
        <DataTable
          nowMonth={price}
          price={totalPembayaran}
          bayar={total_bayar}
          denda={denda}
        />
        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="w-full">
            Kembali
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DataTable({
  price,
  denda,
  bayar,
  nowMonth,
}: {
  price: number;
  denda: string[];
  bayar: number;
  nowMonth: number;
}) {
  return (
    <Table className="w-full">
      <TableBody>
        <TRow cell1="Pembayaran" cell2={numberToIdr(nowMonth)} isBold={false} />
        {denda.map((d, i) => (
          <TRow
            key={i}
            cell1={`Denda ${formatMonthName(d)}`}
            cell2={numberToIdr(10000)}
            isBold={false}
          />
        ))}
        <TRow cell1="Total Tagihan" cell2={numberToIdr(price)} />
        <TRow cell1="Telah dibayar" color="green" cell2={numberToIdr(bayar)} />
        <TRow
          cell1="Pembayaran Kurang"
          color="red"
          cell2={numberToIdr(price - bayar)}
        />
      </TableBody>
    </Table>
  );
}

function TRow({
  cell1,
  cell2,
  color = "red",
  isBold = true,
}: {
  cell1: string;
  cell2: string;
  color?: "red" | "green";
  isBold?: boolean;
}) {
  const colorClass = color === "green" ? "text-accent-green" : "text-danger";
  return (
    <TableRow className={`${isBold ? "font-bold" : ""} ${colorClass}`}>
      <TableCell>{cell1}</TableCell>
      <TableCell className="text-right">{cell2}</TableCell>
    </TableRow>
  );
}
