import { describe, expect, it } from "vitest";

import { hitungHutang } from "./hitung-hutang.ts";
import type { DataBulananDTO } from "./types.ts";

const BILLS = [
	{ _id: 1, title: "Listrik", nominal: 15_000 },
	{ _id: 2, title: "WIFI", nominal: 55_000 },
];

function month(
	tanggal: string,
	users: Array<{ nama: string; total_bayar: number; denda?: string[] }>,
): DataBulananDTO {
	return {
		_id: Number(tanggal),
		tanggal,
		pembayaran: BILLS,
		user: users.map((u, i) => ({
			_id: i + 1,
			nama: u.nama,
			total_bayar: u.total_bayar,
			denda: u.denda ?? [],
		})),
	};
}

describe("hitungHutang", () => {
	it("returns nobody when every member is settled", () => {
		const result = hitungHutang([
			month("052026", [
				{ nama: "Budi", total_bayar: 70_000 },
				{ nama: "Sri", total_bayar: 70_000 },
			]),
		]);
		expect(result).toEqual([]);
	});

	it("reports the shortfall for a partial payment", () => {
		const result = hitungHutang([
			month("052026", [{ nama: "Budi", total_bayar: 50_000 }]),
		]);
		expect(result).toEqual([{ nama: "Budi", nominal: 20_000 }]);
	});

	/**
	 * Covering the bill clears the month even with denda rows attached. Requiring
	 * bill+denda here is what blew the numbers up: denda accrues per month
	 * elapsed, so paid-up members drifted back into debt as time passed.
	 */
	it("excludes someone who covered the bill, even with penalty rows", () => {
		const result = hitungHutang([
			month("032026", [
				{ nama: "Budi", total_bayar: 70_000, denda: ["012026", "022026"] },
			]),
		]);
		expect(result).toEqual([]);
	});

	/** But while still short, the denda rides along on top of the shortfall. */
	it("adds the penalty on top of the shortfall for an underpayer", () => {
		const result = hitungHutang([
			month("032026", [
				{ nama: "Budi", total_bayar: 50_000, denda: ["012026", "022026"] },
			]),
		]);
		// 20.000 kurang + 20.000 denda
		expect(result).toEqual([{ nama: "Budi", nominal: 40_000 }]);
	});

	it("adds up a member's debt across several months", () => {
		const result = hitungHutang([
			month("032026", [{ nama: "Budi", total_bayar: 0, denda: ["022026"] }]),
			month("042026", [{ nama: "Budi", total_bayar: 60_000 }]),
		]);
		// 80.000 (70k bill + 10k denda) + 10.000 shortfall
		expect(result).toEqual([{ nama: "Budi", nominal: 90_000 }]);
	});

	it("never lets an overpaid month reduce debt from another month", () => {
		const result = hitungHutang([
			month("032026", [{ nama: "Budi", total_bayar: 200_000 }]),
			month("042026", [{ nama: "Budi", total_bayar: 0 }]),
		]);
		expect(result).toEqual([{ nama: "Budi", nominal: 70_000 }]);
	});

	it("keeps members separate and preserves first-seen order", () => {
		const result = hitungHutang([
			month("032026", [
				{ nama: "Budi", total_bayar: 0 },
				{ nama: "Sri", total_bayar: 70_000 },
			]),
			month("042026", [
				{ nama: "Budi", total_bayar: 70_000 },
				{ nama: "Sri", total_bayar: 30_000 },
			]),
		]);
		expect(result).toEqual([
			{ nama: "Budi", nominal: 70_000 },
			{ nama: "Sri", nominal: 40_000 },
		]);
	});

	it("handles an empty dataset", () => {
		expect(hitungHutang([])).toEqual([]);
	});
});
