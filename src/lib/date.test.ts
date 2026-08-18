import { describe, expect, it } from "vitest";

import {
	formatDDMMYYYYShort,
	formatMonthName,
	formatMonthYear,
	fromMMYYYY,
	monthDiff,
	subtractMonths,
	toDDMMYYYY,
	toMMYYYY,
} from "./date.ts";

describe("toMMYYYY / fromMMYYYY", () => {
	it("pads the month to two digits", () => {
		expect(toMMYYYY(5, 2026)).toBe("052026");
		expect(toMMYYYY(12, 2026)).toBe("122026");
	});

	it("round-trips", () => {
		expect(fromMMYYYY(toMMYYYY(1, 2026))).toEqual({ bulan: 1, tahun: 2026 });
		expect(fromMMYYYY("122025")).toEqual({ bulan: 12, tahun: 2025 });
	});
});

describe("monthDiff", () => {
	it("counts whole months forward", () => {
		expect(
			monthDiff({ bulan: 5, tahun: 2026 }, { bulan: 3, tahun: 2026 }),
		).toBe(2);
	});

	it("crosses the year boundary", () => {
		expect(
			monthDiff({ bulan: 1, tahun: 2026 }, { bulan: 11, tahun: 2025 }),
		).toBe(2);
	});

	it("is 0 for the same month and negative going backwards", () => {
		expect(
			monthDiff({ bulan: 5, tahun: 2026 }, { bulan: 5, tahun: 2026 }),
		).toBe(0);
		expect(
			monthDiff({ bulan: 3, tahun: 2026 }, { bulan: 5, tahun: 2026 }),
		).toBe(-2);
	});
});

describe("subtractMonths", () => {
	it("subtracts within the same year", () => {
		expect(subtractMonths({ bulan: 5, tahun: 2026 }, 2)).toEqual({
			bulan: 3,
			tahun: 2026,
		});
	});

	/** January minus one must roll back to the previous December, not month 0. */
	it("rolls back across the year boundary", () => {
		expect(subtractMonths({ bulan: 1, tahun: 2026 }, 1)).toEqual({
			bulan: 12,
			tahun: 2025,
		});
	});

	it("rolls back more than a full year", () => {
		expect(subtractMonths({ bulan: 3, tahun: 2026 }, 15)).toEqual({
			bulan: 12,
			tahun: 2024,
		});
	});

	it("returns every month exactly once over a 12-month sweep", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 12; i++) {
			const m = subtractMonths({ bulan: 1, tahun: 2026 }, i);
			expect(m.bulan).toBeGreaterThanOrEqual(1);
			expect(m.bulan).toBeLessThanOrEqual(12);
			seen.add(toMMYYYY(m.bulan, m.tahun));
		}
		expect(seen.size).toBe(12);
	});

	it("is the inverse of monthDiff", () => {
		const now = { bulan: 2, tahun: 2026 };
		for (let i = 1; i <= 24; i++) {
			expect(monthDiff(now, subtractMonths(now, i))).toBe(i);
		}
	});
});

describe("formatting", () => {
	it("renders Indonesian month names", () => {
		expect(formatMonthYear("052026")).toBe("Mei 2026");
		expect(formatMonthName("122026")).toBe("Desember");
		expect(formatMonthYear("012026")).toBe("Januari 2026");
	});

	it("shortens DDMMYYYY for tables", () => {
		expect(formatDDMMYYYYShort("29072026")).toBe("29/07/26");
	});

	it("formats a Date as DDMMYYYY", () => {
		expect(toDDMMYYYY(new Date(2026, 6, 5))).toBe("05072026");
	});
});
