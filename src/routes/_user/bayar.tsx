import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FaWhatsapp } from "react-icons/fa6";

import { ScrollArea } from "#/components/ui/scroll-area";
import web from "#/lib/config";
import { nowMMYYYY } from "#/lib/date";
import { numberToIdr } from "#/lib/toIDR";
import { dataBulananQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/_user/bayar")({
  component: BayarPage,
});

const text = [
  "Jika sudah melakukan pembayaran harap konfirmasi ke whastapp di atas!",
  "Waktu liburan/tidak ada di asrama tetap wajib melakukan pembayaran!",
  "Pembayaran yang terlamat akan dikenakan dendan sebesar Rp. 10.000 perbulan.",
];

function BayarPage() {
  const { data } = useSuspenseQuery(dataBulananQueryOptions);
  const filter = data.dataBulanan.find((v) => v.tanggal === nowMMYYYY());

  return (
    <ScrollArea className="h-full w-full rounded-md">
      <div>
        <div className="h-full flex flex-col gap-3 items-center justify-center p-6">
          <h1 className="text-xl text-center font-semibold text-sb-green">
            Tagihan yang harus dibayar bulan ini
          </h1>
          <div className="w-[80%] rounded-xl bg-card card-soft p-4 mb-4">
            <table className="w-full border-collapse">
              <tbody>
                {filter?.pembayaran.map(({ title, nominal }, i) => (
                  <tr key={i} className="*:py-2 border-b border-border">
                    <td>{title}</td>
                    <td className="text-right font-medium">
                      {numberToIdr(nominal)}
                    </td>
                  </tr>
                ))}
                <tr className="*:py-2 font-semibold text-sb-green">
                  <td>Total</td>
                  <td className="text-right">
                    {numberToIdr(
                      filter?.pembayaran.reduce(
                        (sum, { nominal }) => sum + nominal,
                        0,
                      ) ?? 0,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h1 className="text-xl font-semibold text-sb-green">
            Untuk Pembayaran Online
          </h1>
          <img
            src="/qris.png"
            className="w-[60%] mb-4 rounded-xl bg-card card-soft p-2"
            alt="QRIS"
          />
          <h1 className="text-xl font-semibold text-sb-green">
            Untuk Pembayaran Offline
          </h1>
          <div className="flex gap-2 mb-4 p-2 items-center justify-center w-full">
            <p>Hubungi No Berikut : </p>
            <a
              href={`https://wa.me/${web.no_wa}`}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold flex gap-2 items-center justify-center rounded-full bg-accent-green text-white px-4 py-2 transition-all active:scale-95"
            >
              <FaWhatsapp size={20} />
              <p>Whatsapp</p>
            </a>
          </div>

          {text.map((v, i) => (
            <p
              key={i}
              className="rounded-xl bg-card card-soft p-3 text-center text-sm text-text-soft"
            >
              {v}
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
