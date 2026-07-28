import type { DataBulananDTO, HutangDTO } from "./types";

/**
 * Ported 1:1 from the original `src/utils/hitung-hutang.js`. Computes the
 * outstanding debt per member across all months. Denda is Rp 10.000 per late
 * month. Logic is intentionally unchanged so amounts match the old app exactly.
 */
export function hitungHutang(dataBulanan: DataBulananDTO[]): HutangDTO[] {
  const data: HutangDTO[] = [];

  dataBulanan.forEach((v) => {
    const totalTagihan = v.pembayaran.reduce((a, b) => a + b.nominal, 0);
    v.user.forEach((user) => {
      // Skip members who are already fully paid this month.
      if (user.total_bayar >= totalTagihan) return;

      const isNolDenda = user.denda.length === 0;
      const totalDenda = isNolDenda ? 0 : user.denda.length * 10000;
      const pembayaranPerBulan = totalTagihan - user.total_bayar;
      const hutangBulanIni = pembayaranPerBulan + totalDenda;

      const existing = data.find((d) => d.nama === user.nama);
      if (existing) {
        existing.nominal += hutangBulanIni;
      } else {
        data.push({
          nama: user.nama,
          nominal: hutangBulanIni,
        });
      }
    });
  });

  return data;
}
