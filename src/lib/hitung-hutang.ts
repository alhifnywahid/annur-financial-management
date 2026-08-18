import { hitungTagihanUser } from "./tagihan.ts";
import type { DataBulananDTO, HutangDTO } from "./types.ts";

/**
 * Total outstanding debt per member, summed across every month.
 *
 * Numerically identical to the original `src/utils/hitung-hutang.js`: a member
 * who has covered the month's bill is skipped, otherwise they owe the shortfall
 * plus their denda. The arithmetic now lives in `tagihan.ts` (see that module
 * for why settlement is judged on the bill alone), and the per-member running
 * total uses a Map instead of a linear `data.find()` per row.
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
