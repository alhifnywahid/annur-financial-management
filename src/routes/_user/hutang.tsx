import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import { ScrollArea } from "#/components/ui/scroll-area";
import { dataBulananQueryOptions } from "#/lib/queries";
import { numberToIdr } from "#/lib/toIDR";
import type { HutangDTO } from "#/lib/types";

export const Route = createFileRoute("/_user/hutang")({
  component: HutangPage,
});

function HutangPage() {
  const { data } = useSuspenseQuery(dataBulananQueryOptions);
  const { listHutang } = data;

  return (
    <main className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 h-full">
        <ScrollArea className="h-full w-full rounded-md">
          <div className="flex flex-col gap-2">
            {listHutang.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                <p className="text-lg font-semibold text-accent-green">
                  Semua Lunas
                </p>
                <p className="text-sm text-text-soft">
                  Tidak ada anggota yang memiliki hutang.
                </p>
              </div>
            ) : (
              listHutang.map((user, i) => (
                <Fragment key={i}>
                  <Card
                    name={user.nama}
                    price={numberToIdr(user.nominal)}
                    ifSome={user.nominal === 0}
                  />
                </Fragment>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </main>
  );
}

function Card(props: {
  name: HutangDTO["nama"];
  price: string;
  ifSome: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl p-4 w-full bg-card card-soft transition-all border-l-4 ${
        props.ifSome ? "border-l-accent-green" : "border-l-danger"
      }`}
    >
      <h1 className="text-lg font-semibold">{props.name}</h1>
      <p
        className={`text-lg font-semibold ${
          props.ifSome ? "text-accent-green" : "text-danger"
        }`}
      >
        {props.price}
      </p>
    </div>
  );
}
