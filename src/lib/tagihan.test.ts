import { describe, expect, it } from "vitest";

import {
	DENDA_PER_BULAN,
	hitungTagihanUser,
	totalDenda,
	totalTagihan,
} from "./tagihan.ts";

const BILLS = [{ nominal: 15_000 }, { nominal: 55_000 }]; // Listrik + WIFI = 70k

describe("totalTagihan", () => {
	it("sums the month's bills", () => {
		expect(totalTagihan(BILLS)).toBe(70_000);
	});

	it("is 0 for a month with no bills", () => {
		expect(totalTagihan([])).toBe(0);
	});
});

describe("totalDenda", () => {
	it("charges Rp 10.000 per late month", () => {
		expect(totalDenda(0)).toBe(0);
		expect(totalDenda(1)).toBe(DENDA_PER_BULAN);
		expect(totalDenda(3)).toBe(30_000);
	});
});

describe("hitungTagihanUser", () => {
	it("treats an unpaid month as owing the full bill", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 0,
			totalBayar: 0,
		});
		expect(r.owed).toBe(70_000);
		expect(r.kurang).toBe(70_000);
		expect(r.isLunas).toBe(false);
	});

	it("marks an exact payment as lunas when there is no penalty", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 0,
			totalBayar: 70_000,
		});
		expect(r.kurang).toBe(0);
		expect(r.isLunas).toBe(true);
	});

	/**
	 * The regression this module exists for. Paying exactly the bill while late
	 * used to count as settled in hitung-hutang.ts and in the admin panel, so the
	 * Rp 10.000 penalty was invisible in the totals and uncollectable in the UI.
	 */
	it("still owes the penalty after paying exactly the bill while late", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 2,
			totalBayar: 70_000,
		});
		expect(r.denda).toBe(20_000);
		expect(r.owed).toBe(90_000);
		expect(r.kurang).toBe(20_000);
		expect(r.isLunas).toBe(false);
	});

	it("is lunas once bill and penalty are both covered", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 2,
			totalBayar: 90_000,
		});
		expect(r.kurang).toBe(0);
		expect(r.isLunas).toBe(true);
	});

	/** Overpaying must never render as negative debt (the old `!==` bug). */
	it("floors the shortfall at 0 for an overpayment", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 0,
			totalBayar: 100_000,
		});
		expect(r.kurang).toBe(0);
		expect(r.isLunas).toBe(true);
	});

	it("is lunas at zero paid when the month has no bills and no penalty", () => {
		const r = hitungTagihanUser({ bills: [], dendaCount: 0, totalBayar: 0 });
		expect(r.owed).toBe(0);
		expect(r.isLunas).toBe(true);
	});
});
