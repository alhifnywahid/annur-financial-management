import { hitungTagihanUser } from "./tagihan.ts";
import type { DataBulananDTO, HutangDTO } from "./types.ts";

/**
 * Total outstanding debt per member, summed across every month.
 *
 * Ported from the original `src/utils/hitung-hutang.js`, with one deliberate
 * correction: the old version skipped a member as soon as `total_bayar >=
 * totalTagihan`, ignoring denda entirely. A member who paid exactly the bill
 * while late therefore vanished from this list even though their card showed a
 * shortfall — the Rp 10.000/month penalty was never actually collected. The
 * settled test now comes from the shared rule in `tagihan.ts`, so this page,
 * the member cards and the admin panel all agree. See that module for why the
 * late-month count is calendar-derived and cannot feed back on itself.
 */
export function hitungHutang(dataBulanan: DataBulananDTO[]): HutangDTO[] {
	const totals = new Map<string, number>();

	for (const month of dataBulanan) {
		for (const user of month.user) {
			const { kurang } = hitungTagihanUser({
				bills: month.pembayaran,
				dendaCount: user.denda.length,
				totalBayar: user.total_bayar,
			});
			if (kurang === 0) continue;

			totals.set(user.nama, (totals.get(user.nama) ?? 0) + kurang);
		}
	}

	return [...totals].map(([nama, nominal]) => ({ nama, nominal }));
}
