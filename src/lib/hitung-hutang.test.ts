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
	 * The bug this fix targets: paying exactly the bill while two months late
	 * used to drop the member from this list, hiding Rp 20.000 of real debt.
	 */
	it("includes the penalty for someone who paid the bill but was late", () => {
		const result = hitungHutang([
			month("032026", [
				{ nama: "Budi", total_bayar: 70_000, denda: ["012026", "022026"] },
			]),
		]);
		expect(result).toEqual([{ nama: "Budi", nominal: 20_000 }]);
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
