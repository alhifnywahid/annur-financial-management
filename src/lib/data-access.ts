import { and, eq, inArray } from "drizzle-orm";

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
import { hitungTagihanUser } from "./tagihan.ts";
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

	const members = await db.select().from(dataUser);

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
 * A member who has not settled a past month accrues one `denda` row per month
 * elapsed since then, at Rp 10.000 each.
 *
 * Two corrections over the original `update-denda.js`:
 *
 *  1. The old code compared `total_bayar != totalTagihan`, which penalised
 *     members who OVERPAID and — because it ignored denda — cleared the rows of
 *     anyone who paid the bare bill, quietly forgiving late fees the app had
 *     already shown them. Settlement now comes from the shared rule in
 *     `tagihan.ts`, so a late member must cover bill + penalty to be cleared.
 *
 *  2. It issued one DELETE + one INSERT inside its own transaction per user per
 *     month — roughly 180 round trips for a year of 15 members, on every single
 *     page load. We now diff the computed state against what is stored and
 *     write only the members whose penalty set actually changed, in one
 *     transaction. The steady state (nothing changed) costs zero writes.
 *
 * The penalty COUNT is derived from the calendar (`monthDiff`), never from the
 * stored rows, so it cannot feed back on itself — see `tagihan.ts`.
 */
async function updateDenda(): Promise<void> {
	const now = nowMonth();

	const months = await db.query.dataBulanan.findMany({
		with: {
			pembayaran: true,
			user: { with: { denda: true } },
		},
	});

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
		const lateMonths = Array.from({ length: difference }, (_, i) =>
			subtractMonths(now, difference - i),
		);

		for (const u of month.user) {
			const { isLunas } = hitungTagihanUser({
				bills: month.pembayaran,
				dendaCount: difference,
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
