/**
 * Small, dependency-free date helpers. These replace the Moment.js usage from
 * the original app. The wire formats ("MMYYYY", "DDMMYYYY") are preserved so
 * the ported UI logic and financial calculations stay byte-for-byte identical.
 */

export const FULL_MONTH_ID = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** `bulan` (1-12) + `tahun` -> "MMYYYY" (e.g. 5, 2026 -> "052026"). */
export function toMMYYYY(bulan: number, tahun: number): string {
	return `${pad2(bulan)}${tahun}`;
}

/** "MMYYYY" -> { bulan, tahun }. */
export function fromMMYYYY(value: string): { bulan: number; tahun: number } {
	return {
		bulan: Number(value.slice(0, 2)),
		tahun: Number(value.slice(2)),
	};
}

/** Current month as { bulan (1-12), tahun }. */
export function nowMonth(): { bulan: number; tahun: number } {
	const d = new Date();
	return { bulan: d.getMonth() + 1, tahun: d.getFullYear() };
}

/** Current month as "MMYYYY". */
export function nowMMYYYY(): string {
	const { bulan, tahun } = nowMonth();
	return toMMYYYY(bulan, tahun);
}

/** Whole-month difference: how many months `a` is after `b`. */
export function monthDiff(
	a: { bulan: number; tahun: number },
	b: { bulan: number; tahun: number },
): number {
	return (a.tahun - b.tahun) * 12 + (a.bulan - b.bulan);
}

/** Subtract `n` months from a { bulan, tahun }. */
export function subtractMonths(
	base: { bulan: number; tahun: number },
	n: number,
): { bulan: number; tahun: number } {
	// base.bulan is 1-12; convert to 0-based index math.
	const total = base.tahun * 12 + (base.bulan - 1) - n;
	return { bulan: (total % 12) + 1, tahun: Math.floor(total / 12) };
}

/** "MMYYYY" -> "Mei 2026". */
export function formatMonthYear(mmyyyy: string): string {
	const { bulan, tahun } = fromMMYYYY(mmyyyy);
	return `${FULL_MONTH_ID[bulan - 1]} ${tahun}`;
}

/** "MMYYYY" -> "Mei" (month name only). */
export function formatMonthName(mmyyyy: string): string {
	const { bulan } = fromMMYYYY(mmyyyy);
	return FULL_MONTH_ID[bulan - 1];
}

/** A `Date` -> "DDMMYYYY" (matches the old DataPemasukan/Pengeluaran format). */
export function toDDMMYYYY(date: Date): string {
	return `${pad2(date.getDate())}${pad2(date.getMonth() + 1)}${date.getFullYear()}`;
}

/** "DDMMYYYY" -> "DD/MM/YY" for table display. */
export function formatDDMMYYYYShort(value: string): string {
	const dd = value.slice(0, 2);
	const mm = value.slice(2, 4);
	const yy = value.slice(6, 8);
	return `${dd}/${mm}/${yy}`;
}

/** A `Date` -> "29 Juli 2026" (tanggal nama-bulan tahun). */
export function formatTanggalPanjang(date: Date): string {
	return `${date.getDate()} ${FULL_MONTH_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** "today" as "29 Juli 2026" (tanggal nama-bulan tahun) for the header. */
export function todayLong(): string {
	return formatTanggalPanjang(new Date());
}
