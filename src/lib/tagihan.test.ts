import { describe, expect, it } from "vitest";

import {
	DENDA_PER_BULAN,
	hitungTagihanUser,
	lateMonthsForInactive,
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
	 * The rule that matters most, and the one I got wrong once: covering the BILL
	 * settles the month, even while denda rows exist. Requiring bill+denda makes
	 * the penalty feed itself — denda grows every month that passes, so members
	 * who had paid fall back into arrears and get penalised again retroactively.
	 * On real data that produced 1.441 denda rows and millions in phantom debt.
	 */
	it("is lunas once the bill is covered, even with penalty rows present", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 2,
			totalBayar: 70_000,
		});
		expect(r.isLunas).toBe(true);
		expect(r.kurang).toBe(0);
	});

	/** While genuinely short, the debt is shortfall PLUS denda. */
	it("adds the penalty to the shortfall for an underpayer", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 2,
			totalBayar: 50_000,
		});
		expect(r.denda).toBe(20_000);
		expect(r.owed).toBe(90_000);
		expect(r.kurang).toBe(40_000); // 20k short + 20k denda
		expect(r.isLunas).toBe(false);
	});

	it("owes bill plus penalty when nothing has been paid", () => {
		const r = hitungTagihanUser({
			bills: BILLS,
			dendaCount: 3,
			totalBayar: 0,
		});
		expect(r.kurang).toBe(100_000);
		expect(r.isLunas).toBe(false);
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

/**
 * Aturan beku denda untuk anggota yang berhenti: akumulasi berhenti pada bulan
 * SEBELUM bulan `nonaktif_sejak`. Anggota yang berhenti per Oktober tidak bisa
 * "terlambat" untuk Oktober dan sesudahnya.
 */
describe("lateMonthsForInactive", () => {
	const NOW = { bulan: 10, tahun: 2026 }; // Oktober 2026

	it("drops late months after a long-past deactivation month", () => {
		const late = [
			{ bulan: 5, tahun: 2026 },
			{ bulan: 9, tahun: 2026 },
		];
		// Berhenti per Januari 2025 — Mei/Sep 2026 SESUDAH tanggal berhenti,
		// jadi tidak boleh mengumpulkan denda (akumulasi beku jadi nol).
		expect(lateMonthsForInactive(late, NOW, new Date(2025, 0, 20))).toEqual([]);
	});

	it("keeps accrual up to and including the deactivation month", () => {
		// Berhenti per Oktober 2026: Mei–Okt tetap tercatat (beku), November
		// (yang belum ada saat dia keluar) tidak pernah ditambahkan.
		const late = [
			{ bulan: 5, tahun: 2026 },
			{ bulan: 9, tahun: 2026 },
			{ bulan: 10, tahun: 2026 },
			{ bulan: 11, tahun: 2026 },
		];
		expect(
			lateMonthsForInactive(late, NOW, new Date(2026, 9, 1, 12, 0, 0)),
		).toEqual([
			{ bulan: 5, tahun: 2026 },
			{ bulan: 9, tahun: 2026 },
			{ bulan: 10, tahun: 2026 },
		]);
	});

	it("never grows past the deactivation month in later reads", () => {
		// Baca ulang di November: set November tidak muncul lagi — beku permanen.
		const now = { bulan: 11, tahun: 2026 };
		const late = [
			{ bulan: 6, tahun: 2026 },
			{ bulan: 9, tahun: 2026 },
			{ bulan: 10, tahun: 2026 },
			{ bulan: 11, tahun: 2026 },
		];
		expect(lateMonthsForInactive(late, now, new Date(2026, 9, 20))).toEqual([
			{ bulan: 6, tahun: 2026 },
			{ bulan: 9, tahun: 2026 },
			{ bulan: 10, tahun: 2026 },
		]);
	});

	it("crosses the year boundary correctly", () => {
		// Berhenti per Januari 2026: akumulasi s.d. Januari (termasuk) tetap,
		// Februari dan sesudahnya tidak.
		const late = [
			{ bulan: 12, tahun: 2025 },
			{ bulan: 1, tahun: 2026 },
			{ bulan: 2, tahun: 2026 },
		];
		const now = { bulan: 2, tahun: 2026 };
		expect(lateMonthsForInactive(late, now, new Date(2026, 0, 15))).toEqual([
			{ bulan: 12, tahun: 2025 },
			{ bulan: 1, tahun: 2026 },
		]);
	});
});
