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
import CardUser from "#/components/CardUser";
import { formatMonthYear } from "#/lib/date";
import { dataBulananQueryOptions } from "#/lib/queries";
import type { DataBulananDTO } from "#/lib/types";

export const Route = createFileRoute("/_user/data")({
  component: DataPage,
});

function DataPage() {
  const { data } = useSuspenseQuery(dataBulananQueryOptions);

  return (
    <main className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 h-full">
        <ScrollArea className="h-full w-full rounded-md">
          <div>
            <Accordion type="single" collapsible className="w-full">
              {data.dataBulanan.map((bulan, i) => (
                <Fragment key={bulan._id}>
                  <DataAccordion data={bulan} i={i} />
                </Fragment>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
      </div>
    </main>
  );
}

function DataAccordion({ data, i }: { data: DataBulananDTO; i: number }) {
  const { user, pembayaran } = data;
  const perBulan = pembayaran.reduce((a, b) => a + b.nominal, 0) * user.length;
  const denda = user.reduce((a, b) => a + b.denda.length * 10000, 0);
  const totalBayar = user.reduce((a, b) => a + b.total_bayar, 0);
  // Month is settled (green) once payments cover the bill + denda. Using `<`
  // (not `!==`) so an overpaid month isn't wrongly flagged red, consistent
  // with the per-user card and /admin/data-pembayaran.
  const isHaveNotPaid = totalBayar < perBulan + denda;
  const monthNow = formatMonthYear(data.tanggal);

  return (
    <AccordionItem value={`item-${i + 1}`} className="w-full">
      <AccordionTrigger
        className={isHaveNotPaid ? "text-danger" : "text-sb-green"}
      >
        {monthNow}
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-2">
          {user.map((u) => (
            <Fragment key={u._id}>
              <CardUser bulan={data} user={u} />
            </Fragment>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
