/**
 * Single source of truth for "how much does this member owe for this month".
 *
 * Before this module existed, three places each computed it differently:
 *
 *   - CardUser.tsx          lunas when total_bayar >= tagihan + denda
 *   - hitung-hutang.ts      skip   when total_bayar >= tagihan          (no denda)
 *   - admin/data-pembayaran unpaid when total_bayar <  tagihan          (no denda)
 *
 * The disagreement was not cosmetic: a member who paid exactly the bill but was
 * late still showed a red "-Rp 20.000" on their card, yet was absent from the
 * Hutang page AND from the admin payment panel — so the penalty could not be
 * seen in the totals nor collected through the UI. Worse, `updateDenda` treated
 * "paid the bare bill" as settled and wiped the penalty rows on the next page
 * load, quietly forgiving every late fee the app had promised to charge.
 *
 * The rule below is the one the app's own UI text promises to members:
 * "Pembayaran yang terlambat akan dikenakan denda sebesar Rp. 10.000 perbulan."
 *
 *     owed  = total tagihan bulan itu + (jumlah bulan terlambat x 10.000)
 *     lunas = total_bayar >= owed
 *
 * IMPORTANT (why this does not chase its own tail): the number of late months is
 * derived from the CALENDAR (`monthDiff` between now and the month), never from
 * the stored `denda` rows. If "late" were derived from "underpaid" while
 * "underpaid" included the penalty, having a penalty would keep the penalty
 * alive forever and no member could ever settle. Keeping the count calendar-only
 * makes the fixpoint reachable: pay `owed` and the penalty rows clear for good.
 */

/** Denda per late month, in rupiah. */
export const DENDA_PER_BULAN = 10_000;

/** Sum of a month's bills (Listrik + WIFI + anything the admin added). */
export function totalTagihan(
	bills: ReadonlyArray<{ nominal: number }>,
): number {
	return bills.reduce((sum, bill) => sum + bill.nominal, 0);
}

/** Rupiah owed in penalties for `count` late months. */
export function totalDenda(count: number): number {
	return count * DENDA_PER_BULAN;
}

export interface TagihanUser {
	/** Sum of the month's bills. */
	tagihan: number;
	/** Penalty total for the late months. */
	denda: number;
	/** What the member must pay in total: `tagihan + denda`. */
	owed: number;
	/** Shortfall, floored at 0 so an overpayment never reads as negative debt. */
	kurang: number;
	/** True once the member has paid at least `owed`. */
	isLunas: boolean;
}

/**
 * Resolve one member's position for one month.
 *
 * `dendaCount` is the number of late months: the stored `denda` rows when
 * reading (they mirror the calendar), or `monthDiff` when recomputing them.
 */
export function hitungTagihanUser(input: {
	bills: ReadonlyArray<{ nominal: number }>;
	dendaCount: number;
	totalBayar: number;
}): TagihanUser {
	const tagihan = totalTagihan(input.bills);
	const denda = totalDenda(input.dendaCount);
	const owed = tagihan + denda;

	return {
		tagihan,
		denda,
		owed,
		kurang: Math.max(0, owed - input.totalBayar),
		isLunas: input.totalBayar >= owed,
	};
}
