import { and, eq, gte, inArray, isNotNull, isNull, or } from "drizzle-orm";

import { db } from "#/db";
import {
	bulananUser,
	dataBulanan,
	dataPemasukan,
	dataPengeluaran,
	dataUser,
	denda,
	pembayaran,
} from "#/db/schema";
import {
	fromMMYYYY,
	monthDiff,
	nowMonth,
	subtractMonths,
	toMMYYYY,
} from "./date.ts";
import { hitungTagihanUser, lateMonthsForInactive } from "./tagihan.ts";
import type {
	BulananUserDTO,
	DataBulananDTO,
	PembayaranDTO,
	TransaksiDTO,
} from "./types.ts";

/* -------------------------------------------------------------------------- */
/*  Default template for a brand-new month (ported from old src/data.js)       */
/* -------------------------------------------------------------------------- */

const DEFAULT_PEMBAYARAN = [
	{ title: "Listrik", nominal: 15000 },
	{ title: "WIFI", nominal: 55000 },
];

/**
 * Master list of members to seed into a new month: everyone whose
 * `nonaktif_sejak` is NULL, or falls on/after this month's first day
 * (an `nonaktif_sejak` inside October still belongs to October's roster —
 * the member was present for part of it).
 */
async function getActiveMembers(bulan: number, tahun: number) {
	const firstOfMonth = new Date(tahun, bulan - 1, 1, 12, 0, 0);
	return db
		.select()
		.from(dataUser)
		.where(
			or(
				isNull(dataUser.nonaktifSejak),
				gte(dataUser.nonaktifSejak, firstOfMonth),
			),
		);
}

/**
 * Creates the DataBulanan row for the current month if it does not exist yet,
 * seeding it with the default bills and one `bulananUser` row per member.
 * Equivalent to old `getDataBulananNew()` + the "create if missing" logic.
 *
 * Safe under concurrency: two simultaneous first-visitors of a new month both
 * see "missing" and both try to insert. The `onConflictDoNothing` turns the
 * loser's insert into a no-op (returning no row) instead of a unique-violation
 * error, and it then skips seeding so the winner's bills are not duplicated.
 */
async function ensureMonthExists(bulan: number, tahun: number): Promise<void> {
	const existing = await db.query.dataBulanan.findFirst({
		where: and(eq(dataBulanan.bulan, bulan), eq(dataBulanan.tahun, tahun)),
	});
	if (existing) return;

	const members = await getActiveMembers(bulan, tahun);

	await db.transaction(async (tx) => {
		const [bulananRow] = await tx
			.insert(dataBulanan)
			.values({ bulan, tahun })
			.onConflictDoNothing()
			.returning();

		// Lost the race: another request created this month and seeded it.
		if (!bulananRow) return;

		if (DEFAULT_PEMBAYARAN.length > 0) {
			await tx.insert(pembayaran).values(
				DEFAULT_PEMBAYARAN.map((p) => ({
					dataBulananId: bulananRow.id,
					title: p.title,
					nominal: p.nominal,
				})),
			);
		}

		if (members.length > 0) {
			await tx.insert(bulananUser).values(
				members.map((m) => ({
					dataBulananId: bulananRow.id,
					nama: m.nama,
					totalBayar: 0,
				})),
			);
		}
	});
}

/* -------------------------------------------------------------------------- */
/*  Denda recalculation (ported from old update-denda.js)                      */
/* -------------------------------------------------------------------------- */

/** Stable comparison key for a set of late months. */
function dendaKey(
	months: ReadonlyArray<{ bulan: number; tahun: number }>,
): string {
	return months
		.map((m) => m.tahun * 12 + m.bulan)
		.sort((a, b) => a - b)
		.join(",");
}

/**
 * Recomputes late-month penalties for every month before the current one.
 * A member who has not covered a past month's BILL accrues one `denda` row per
 * month elapsed since then, at Rp 10.000 each.
 *
 * This function is what makes the invariant in `tagihan.ts` true:
 *
 *     ada baris denda  =>  total_bayar < total tagihan
 *
 * because a member who has covered the bill gets their rows cleared here. That
 * invariant is why the read paths can test settlement against the bill alone.
 *
 * Settlement therefore compares against the BILL, never bill+denda. Comparing
 * against bill+denda makes the penalty feed itself: `denda` grows with every
 * month that passes, so an old month's "owed" drifts upward forever, members who
 * had genuinely paid fall back into arrears, and they get penalised again
 * retroactively. Measured on real data, that turned 6 denda rows into 1.441 and
 * put every member millions in debt.
 *
 * One correction over the original `update-denda.js`: it compared
 * `total_bayar != totalTagihan`, which penalised members who OVERPAID (paid
 * 100k for a 70k bill). `<` treats anyone who paid at least the bill as settled.
 *
 * Performance: the original issued one DELETE + one INSERT inside its own
 * transaction per user per month — roughly 180 round trips for a year of 15
 * members, on every single page load. We now diff the computed state against
 * what is stored and write only the members whose penalty set actually changed,
 * in one transaction. The steady state (nothing changed) costs zero writes.
 */
async function updateDenda(): Promise<void> {
	const now = nowMonth();

	const months = await db.query.dataBulanan.findMany({
		with: {
			pembayaran: true,
			user: { with: { denda: true } },
		},
	});

	// Deactivated members: their penalty accrual is FROZEN at the month before
	// they left (they are no longer around to be late for anything after that),
	// while their existing arrears stay visible until paid. Keyed by name
	// because bulanan_user references members by name.
	const inactive: Record<string, Date> = {};
	for (const row of await db
		.select({ nama: dataUser.nama, nonaktifSejak: dataUser.nonaktifSejak })
		.from(dataUser)
		.where(isNotNull(dataUser.nonaktifSejak))) {
		if (row.nonaktifSejak) inactive[row.nama] = row.nonaktifSejak;
	}

	/** bulananUser ids whose stored penalty set is stale. */
	const stale: number[] = [];
	const rows: Array<{ bulananUserId: number; bulan: number; tahun: number }> =
		[];

	for (const month of months) {
		const difference = monthDiff(now, {
			bulan: month.bulan,
			tahun: month.tahun,
		});
		// The current month (and anything in the future) is never late.
		if (difference <= 0) continue;

		// [now-difference, ... now-1] in chronological order.
		let lateMonths = Array.from({ length: difference }, (_, i) =>
			subtractMonths(now, difference - i),
		);

		for (const u of month.user) {
			// Frozen accrual for deactivated members: drop every late month on or
			// after their `nonaktif_sejak` month, so the stored set never grows
			// past the point they left. (Rows for months after departure are
			// removed by `deactivateMember` itself; this cutoff only stops growth.)
			const deact = inactive[u.nama];
			if (deact) {
				lateMonths = lateMonthsForInactive(lateMonths, now, deact);
			}

			// `dendaCount: 0` on purpose: settlement is judged on the bill alone —
			// see the note above on why bill+denda feeds itself.
			const { isLunas } = hitungTagihanUser({
				bills: month.pembayaran,
				dendaCount: 0,
				totalBayar: u.totalBayar,
			});

			const desired = isLunas ? [] : lateMonths;
			if (dendaKey(desired) === dendaKey(u.denda)) continue;

			stale.push(u.id);
			for (const m of desired) {
				rows.push({ bulananUserId: u.id, bulan: m.bulan, tahun: m.tahun });
			}
		}
	}

	if (stale.length === 0) return;

	await db.transaction(async (tx) => {
		// Chunked so a large backfill cannot blow past the bind-parameter limit.
		for (let i = 0; i < stale.length; i += 500) {
			await tx
				.delete(denda)
				.where(inArray(denda.bulananUserId, stale.slice(i, i + 500)));
		}
		for (let i = 0; i < rows.length; i += 500) {
			await tx.insert(denda).values(rows.slice(i, i + 500));
		}
	});
}

/**
 * Ported from old `checkNowMonth()`: refresh denda, then make sure the current
 * month's DataBulanan exists.
 *
 * Errors are logged and swallowed rather than propagated. This runs on the read
 * path of every page, and a transient database hiccup here should not blank out
 * the whole app: the pages can still render from whatever is already stored,
 * and the next request retries. `updateDenda` and `ensureMonthExists` are both
 * idempotent, so a failed run leaves nothing half-applied.
 */
export async function checkNowMonth(): Promise<void> {
	try {
		await updateDenda();
	} catch (error) {
		console.error("checkNowMonth: gagal memperbarui denda:", error);
	}

	try {
		const { bulan, tahun } = nowMonth();
		await ensureMonthExists(bulan, tahun);
	} catch (error) {
		console.error("checkNowMonth: gagal menyiapkan bulan berjalan:", error);
	}
}

/* -------------------------------------------------------------------------- */
/*  Member activation / deactivation                                           */
/* -------------------------------------------------------------------------- */

/**
 * Marks a member as inactive from `deact` (a date whose month is the effective
 * month, e.g. any day of October for "berhenti per Oktober").
 *
 * What happens to the money (nothing is ever deleted):
 *   - Payments from the effective month onward are ZEROED (a member who left
 *     per October cannot have paid for October onward). Historical rows before
 *     that month are untouched, so their arrears stay visible on the Hutang
 *     page until actually paid.
 *   - Penalty rows dated on/after the effective month are removed; accrual for
 *     months BEFORE it stays frozen in place (updateDenda never extends a
 *     deactivated member's set — see its cutoff logic).
 *   - Future months: getActiveMembers() skips them at seeding time.
 */
export async function deactivateMember(id: number, deact: Date): Promise<void> {
	await db.transaction(async (tx) => {
		const [target] = await tx
			.select()
			.from(dataUser)
			.where(eq(dataUser.id, id));
		if (!target) throw new Error("User tidak ditemukan");

		await tx
			.update(dataUser)
			.set({ nonaktifSejak: deact })
			.where(eq(dataUser.id, id));

		const months = await tx
			.select({
				id: dataBulanan.id,
				bulan: dataBulanan.bulan,
				tahun: dataBulanan.tahun,
			})
			.from(dataBulanan);
		const cutoff = {
			bulan: deact.getMonth() + 1,
			tahun: deact.getFullYear(),
		};
		const fromIds = months
			.filter((m) => monthDiff(m, cutoff) >= 0)
			.map((m) => m.id);

		if (fromIds.length > 0) {
			const byName = and(
				eq(bulananUser.nama, target.nama),
				inArray(bulananUser.dataBulananId, fromIds),
			);

			// Months from the effective month on are not this member's liability
			// anymore. Rows that only exist as seeding artifacts (total_bayar = 0)
			// are removed entirely so the member disappears from those months'
			// tagihan; rows that already carry payments are ZEROED instead of
			// deleted, because totalSaldo = SUM(total_bayar) + masuk - keluar and
			// deleting paid rows would silently rewrite the cash balance.
			await tx
				.delete(bulananUser)
				.where(and(byName, eq(bulananUser.totalBayar, 0)));
			await tx
				.update(bulananUser)
				.set({ totalBayar: 0 })
				.where(and(byName, gte(bulananUser.totalBayar, 1)));

			const buRows = await tx
				.select({ id: bulananUser.id })
				.from(bulananUser)
				.where(byName);
			const ids = buRows.map((r) => r.id);
			for (let i = 0; i < ids.length; i += 500) {
				await tx
					.delete(denda)
					.where(inArray(denda.bulananUserId, ids.slice(i, i + 500)));
			}
		}
	});
}

/**
 * Clears a member's inactive flag and re-enters them into the current month's
 * roster if that month was already seeded (otherwise ensureMonthExists picks
 * them up on the next read). Denda accrual resumes on its own: updateDenda no
 * longer sees them in the inactive map.
 */
export async function activateMember(id: number): Promise<void> {
	const [target] = await db
		.update(dataUser)
		.set({ nonaktifSejak: null })
		.where(eq(dataUser.id, id))
		.returning();
	if (!target) throw new Error("User tidak ditemukan");

	const { bulan, tahun } = nowMonth();
	const [month] = await db
		.select({ id: dataBulanan.id })
		.from(dataBulanan)
		.where(and(eq(dataBulanan.bulan, bulan), eq(dataBulanan.tahun, tahun)));
	if (month) {
		await db
			.insert(bulananUser)
			.values({ dataBulananId: month.id, nama: target.nama, totalBayar: 0 })
			.onConflictDoNothing();
	}
}

/**
 * Adds a member who was registered mid-month to the CURRENT month's roster, so
 * "tambah anak" immediately shows up in this month's tagihan even though
 * ensureMonthExists only seeds when the month row is first created.
 */
export async function seedMemberToCurrentMonth(nama: string): Promise<void> {
	const { bulan, tahun } = nowMonth();
	const [month] = await db
		.select({ id: dataBulanan.id })
		.from(dataBulanan)
		.where(and(eq(dataBulanan.bulan, bulan), eq(dataBulanan.tahun, tahun)));
	if (!month) return; // No month row yet: ensureMonthExists will seed it.
	await db
		.insert(bulananUser)
		.values({ dataBulananId: month.id, nama, totalBayar: 0 })
		.onConflictDoNothing();
}

/* -------------------------------------------------------------------------- */
/*  Mapping helpers: relational rows -> Mongo-shaped DTOs                       */
/* -------------------------------------------------------------------------- */

function mapBulananToDTO(month: {
	id: number;
	bulan: number;
	tahun: number;
	pembayaran: Array<{ id: number; title: string; nominal: number }>;
	user: Array<{
		id: number;
		nama: string;
		totalBayar: number;
		denda: Array<{ bulan: number; tahun: number }>;
	}>;
}): DataBulananDTO {
	const pembayaranDTO: PembayaranDTO[] = month.pembayaran.map((p) => ({
		_id: p.id,
		title: p.title,
		nominal: p.nominal,
	}));

	const userDTO: BulananUserDTO[] = month.user.map((u) => ({
		_id: u.id,
		nama: u.nama,
		total_bayar: u.totalBayar,
		denda: u.denda
			.map((d) => ({
				key: d.tahun * 12 + d.bulan,
				mmyyyy: toMMYYYY(d.bulan, d.tahun),
			}))
			.sort((a, b) => a.key - b.key)
			.map((d) => d.mmyyyy),
	}));

	return {
		_id: month.id,
		tanggal: toMMYYYY(month.bulan, month.tahun),
		pembayaran: pembayaranDTO,
		user: userDTO,
	};
}

function mapTransaksiToDTO(row: {
	id: number;
	title: string;
	nominal: number;
	tanggal: Date;
}): TransaksiDTO {
	const d = row.tanggal;
	const pad = (n: number) => String(n).padStart(2, "0");
	return {
		_id: row.id,
		title: row.title,
		nominal: row.nominal,
		tanggal: `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`,
	};
}

/* -------------------------------------------------------------------------- */
/*  Read helpers                                                               */
/* -------------------------------------------------------------------------- */

export async function getAllDataBulananDTO(): Promise<DataBulananDTO[]> {
	const months = await db.query.dataBulanan.findMany({
		with: {
			pembayaran: true,
			user: { with: { denda: true } },
		},
		orderBy: (m, { asc }) => [asc(m.tahun), asc(m.bulan)],
	});
	return months.map(mapBulananToDTO);
}

/**
 * Oldest first. The UI reverses this to show the newest entry at the top, so an
 * explicit ORDER BY matters: without one Postgres may return rows in any order
 * (notably after an UPDATE moves a row), and the table would shuffle.
 */
export async function getAllPemasukanDTO(): Promise<TransaksiDTO[]> {
	const rows = await db
		.select()
		.from(dataPemasukan)
		.orderBy(dataPemasukan.tanggal, dataPemasukan.id);
	return rows.map(mapTransaksiToDTO);
}

/** Oldest first — see `getAllPemasukanDTO`. */
export async function getAllPengeluaranDTO(): Promise<TransaksiDTO[]> {
	const rows = await db
		.select()
		.from(dataPengeluaran)
		.orderBy(dataPengeluaran.tanggal, dataPengeluaran.id);
	return rows.map(mapTransaksiToDTO);
}

/* re-export for server functions that need raw tables */
export { fromMMYYYY };
