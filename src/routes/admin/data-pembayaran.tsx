import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { ScrollArea } from "#/components/ui/scroll-area";
import FormTambahPembayaran from "#/components/admin/FormTambahPembayaran";
import { formatMonthYear } from "#/lib/date";
import { numberToIdr } from "#/lib/toIDR";
import { dataBulananQueryOptions } from "#/lib/queries";
import type { DataBulananDTO } from "#/lib/types";

export const Route = createFileRoute("/admin/data-pembayaran")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dataBulananQueryOptions),
  component: DataPembayaranPage,
});

function DataPembayaranPage() {
  const { data } = useSuspenseQuery(dataBulananQueryOptions);
  const months = getUnpaidMonths(data.dataBulanan);

  return (
    <div className="flex flex-col gap-2 h-full my-3">
      <ScrollArea className="h-full w-full rounded-md">
        <div className="p-4">
          <Accordion type="single" collapsible className="w-full">
            {months.map((bulan, i) => (
              <Fragment key={bulan.tanggal}>
                <AccordionItem value={`item-${i + 1}`} className="w-full">
                  <AccordionTrigger className="text-sb-green">
                    {formatMonthYear(bulan.tanggal)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      {bulan.unpaidUsers.map((user) => {
                        const totalTagihan = bulan.pembayaran.reduce(
                          (a, b) => a + b.nominal,
                          0,
                        );
                        const max =
                          totalTagihan +
                          user.denda.length * 10000 -
                          user.total_bayar;
                        const price =
                          totalTagihan === user.total_bayar
                            ? "Lunas"
                            : `- ${numberToIdr(max)}`;
                        return (
                          <Fragment key={user._id}>
                            <FormTambahPembayaran
                              max={max}
                              name={user.nama}
                              tanggal={bulan.tanggal}
                              price={price}
                            />
                          </Fragment>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Fragment>
            ))}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

function getUnpaidMonths(data: DataBulananDTO[]) {
  return data
    .map((month) => {
      const totalPayment = month.pembayaran.reduce(
        (sum, payment) => sum + payment.nominal,
        0,
      );
      const unpaidUsers = month.user.filter(
        (user) => user.total_bayar < totalPayment,
      );
      if (unpaidUsers.length > 0) {
        return {
          tanggal: month.tanggal,
          pembayaran: month.pembayaran,
          unpaidUsers,
        };
      }
      return null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}
