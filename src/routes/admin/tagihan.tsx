import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import { ScrollArea } from "#/components/ui/scroll-area";
import ActionTagihan from "#/components/admin/ActionTagihan";
import FormTagihan from "#/components/admin/FormTagihan";
import { nowMMYYYY } from "#/lib/date";
import { numberToIdr } from "#/lib/toIDR";
import { dataBulananQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/admin/tagihan")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dataBulananQueryOptions),
  component: TagihanPage,
});

function TagihanPage() {
  const { data } = useSuspenseQuery(dataBulananQueryOptions);
  const current = data.dataBulanan.find((v) => v.tanggal === nowMMYYYY());
  const tagihan = current?.pembayaran ?? [];

  return (
    <div className="flex flex-col gap-3 h-full mb-3">
      <h1 className="text-lg font-semibold mt-2 text-sb-green">
        List tagihan bulan ini :
      </h1>
      <ScrollArea className="h-full w-full rounded-xl border bg-card card-soft">
        <div className="p-4">
          <table className="w-full">
            <tbody>
              {tagihan.map((item, i) => (
                <Fragment key={item._id}>
                  <tr className="*:py-1 border-b border-border last:border-0">
                    <td className="text-center text-text-soft">{i + 1}.</td>
                    <td>{item.title}</td>
                    <td className="text-center font-medium">
                      {numberToIdr(item.nominal).replace(",00", "")}
                    </td>
                    <td>
                      <ActionTagihan
                        data={{
                          id: item._id,
                          title: item.title,
                          nominal: item.nominal,
                        }}
                      />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
      <FormTagihan />
    </div>
  );
}
