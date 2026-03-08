import { numberToIdr } from "@/utils/toIDR";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Fragment } from "react";

export default async function Page() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/data-bulanan`, {
    cache: "no-store",
  });
  const { listHutang } = await res.json();
  return (
    <main className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 h-full">
        <ScrollArea className="h-full w-full rounded-md">
          <div className="flex flex-col gap-2">
            {listHutang.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                <p className="text-lg font-semibold text-green-500">Semua Lunas</p>
                <p className="text-sm text-gray-400">Tidak ada anggota yang memiliki hutang.</p>
              </div>
            ) : (
              listHutang.map((user, i) => (
                <Fragment key={i}>
                  <Card
                    data={user}
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

const Card = (props) => {
  return (
    <div
      className={`flex items-center justify-between rounded-md p-4 w-full hover:bg-gray-900 cursor-pointer transition-all border ${props.className
        } ${props.ifSome ? "border-green-700" : "border-red-700"}`}
    >
      <h1 className="text-lg font-semibold">{props.name}</h1>
      <p className="text-lg font-semibold">{props.price}</p>
    </div>
  );
};

