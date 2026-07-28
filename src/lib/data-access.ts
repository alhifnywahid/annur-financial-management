import { and, eq } from "drizzle-orm";

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
} from "./date";
import type {
  BulananUserDTO,
  DataBulananDTO,
  PembayaranDTO,
  TransaksiDTO,
} from "./types";

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
      .returning();

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

/**
 * Recomputes late-month penalties for every month before the current one.
 * For each past month, members who have not paid the full bill get a `denda`
 * row for each month elapsed since that month.
 *  - bulanTerlambat = [now-1, now-2, ... back to the month itself]
 *  - only applied to users who UNDERPAID (total_bayar < total tagihan)
 *
 * NOTE: the original app used `total_bayar != total tagihan`, which wrongly
 * penalised members who OVERPAID (e.g. paid 100k for a 70k bill). We use `<`
 * so anyone who paid at least the bill is considered settled - this matches
 * the authoritative "unpaid" rule on /admin/data-pembayaran.
 */
async function updateDenda(): Promise<void> {
  const now = nowMonth();
  const nowKey = toMMYYYY(now.bulan, now.tahun);

  const months = await db.query.dataBulanan.findMany({
    with: {
      pembayaran: true,
      user: { with: { denda: true } },
    },
  });

  for (const month of months) {
    const monthKey = toMMYYYY(month.bulan, month.tahun);
    if (monthKey === nowKey) continue;

    const difference = monthDiff(now, {
      bulan: month.bulan,
      tahun: month.tahun,
    });
    if (difference <= 0) continue;

    const totalPembayaran = month.pembayaran.reduce((a, b) => a + b.nominal, 0);

    // bulanTerlambat: [now-1, now-2, ..., now-difference], then reversed
    // (matches the original `.reverse()`), giving chronological order.
    const bulanTerlambat: Array<{ bulan: number; tahun: number }> = [];
    for (let i = 1; i <= difference; i++) {
      bulanTerlambat.push(subtractMonths(now, i));
    }
    bulanTerlambat.reverse();

    for (const u of month.user) {
      // Only genuine underpayers accrue a late penalty; anyone who paid the
      // full bill (exact or overpaid) must have their denda cleared.
      const isUnderpaid = u.totalBayar < totalPembayaran;

      // Fast path: already settled and no stale penalty -> nothing to do.
      if (!isUnderpaid && u.denda.length === 0) continue;

      // Recompute this user's denda: wipe the old rows, then re-insert the
      // freshly computed set only if they underpaid. Paid users end up with 0.
      await db.transaction(async (tx) => {
        await tx.delete(denda).where(eq(denda.bulananUserId, u.id));
        if (isUnderpaid && bulanTerlambat.length > 0) {
          await tx.insert(denda).values(
            bulanTerlambat.map((m) => ({
              bulananUserId: u.id,
              bulan: m.bulan,
              tahun: m.tahun,
            })),
          );
        }
      });
    }
  }
}

/**
 * Ported from old `checkNowMonth()`: refresh denda, then make sure the current
 * month's DataBulanan exists.
 */
export async function checkNowMonth(): Promise<void> {
  try {
    await updateDenda();
    const { bulan, tahun } = nowMonth();
    await ensureMonthExists(bulan, tahun);
  } catch (error) {
    console.error("checkNowMonth error:", error);
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

export async function getAllPemasukanDTO(): Promise<TransaksiDTO[]> {
  const rows = await db.select().from(dataPemasukan);
  return rows.map(mapTransaksiToDTO);
}

export async function getAllPengeluaranDTO(): Promise<TransaksiDTO[]> {
  const rows = await db.select().from(dataPengeluaran);
  return rows.map(mapTransaksiToDTO);
}

/* re-export for server functions that need raw tables */
export { fromMMYYYY };
