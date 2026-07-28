/**
 * One-time ETL: migrate data from the old MongoDB database into the new
 * normalized Neon Postgres schema.
 *
 * Usage:
 *   npm run migrate:data
 *
 * It is idempotent-ish: it TRUNCATEs the domain tables first (NOT the auth
 * tables) so it can be re-run safely during development. Remove MONGO_URI from
 * .env.local once you no longer need it.
 */
import dns from "node:dns";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import * as schema from "../src/db/schema.ts";

config({ path: [".env.local", ".env"] });

// Atlas uses SRV records; some local/ISP resolvers refuse SRV queries.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

interface OldPembayaran {
  title: string;
  nominal: number;
}
interface OldBulananUser {
  nama: string;
  total_bayar: number;
  denda?: string[];
}
interface OldDataBulanan {
  tanggal: string; // "MMYYYY"
  pembayaran: OldPembayaran[];
  user: OldBulananUser[];
}
interface OldTransaksi {
  title: string;
  nominal: number;
  tanggal: string; // "DDMMYYYY"
}
interface OldDataUser {
  nama: string;
}

function fromMMYYYY(value: string): { bulan: number; tahun: number } {
  return { bulan: Number(value.slice(0, 2)), tahun: Number(value.slice(2)) };
}

/** "DDMMYYYY" -> Date (local midday to avoid TZ rollovers). */
function fromDDMMYYYY(value: string): Date {
  const dd = Number(value.slice(0, 2));
  const mm = Number(value.slice(2, 4));
  const yyyy = Number(value.slice(4, 8));
  return new Date(yyyy, mm - 1, dd, 12, 0, 0);
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!MONGO_URI) throw new Error("MONGO_URI is not set in .env.local");
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set in .env.local");

  const mongo = new MongoClient(MONGO_URI);
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    await mongo.connect();
    const mdb = mongo.db(); // database from the connection string
    console.log("Connected to MongoDB:", mdb.databaseName);

    const oldUsers = await mdb
      .collection<OldDataUser>("datausers")
      .find({})
      .toArray();
    const oldBulanan = await mdb
      .collection<OldDataBulanan>("databulanans")
      .find({})
      .toArray();
    const oldPemasukan = await mdb
      .collection<OldTransaksi>("datapemasukans")
      .find({})
      .toArray();
    const oldPengeluaran = await mdb
      .collection<OldTransaksi>("datapengeluarans")
      .find({})
      .toArray();

    console.log(
      `Found: ${oldUsers.length} users, ${oldBulanan.length} months, ` +
        `${oldPemasukan.length} pemasukan, ${oldPengeluaran.length} pengeluaran`,
    );

    // Clean domain tables (cascades to pembayaran / bulanan_user / denda).
    await db.execute(
      sql`TRUNCATE TABLE ${schema.denda}, ${schema.bulananUser}, ${schema.pembayaran}, ${schema.dataBulanan}, ${schema.dataPemasukan}, ${schema.dataPengeluaran}, ${schema.dataUser} RESTART IDENTITY CASCADE`,
    );

    // 1) data_user
    if (oldUsers.length > 0) {
      await db
        .insert(schema.dataUser)
        .values(oldUsers.map((u) => ({ nama: u.nama })));
    }

    // 2) data_bulanan + pembayaran + bulanan_user + denda
    for (const month of oldBulanan) {
      const { bulan, tahun } = fromMMYYYY(month.tanggal);
      const [bulananRow] = await db
        .insert(schema.dataBulanan)
        .values({ bulan, tahun })
        .returning();

      if (month.pembayaran?.length) {
        await db.insert(schema.pembayaran).values(
          month.pembayaran.map((p) => ({
            dataBulananId: bulananRow.id,
            title: p.title,
            nominal: p.nominal,
          })),
        );
      }

      for (const u of month.user ?? []) {
        const [userRow] = await db
          .insert(schema.bulananUser)
          .values({
            dataBulananId: bulananRow.id,
            nama: u.nama,
            totalBayar: u.total_bayar ?? 0,
          })
          .returning();

        const dendaList = (u.denda ?? []).filter(Boolean);
        if (dendaList.length > 0) {
          await db.insert(schema.denda).values(
            dendaList.map((d) => {
              const m = fromMMYYYY(d);
              return {
                bulananUserId: userRow.id,
                bulan: m.bulan,
                tahun: m.tahun,
              };
            }),
          );
        }
      }
    }

    // 3) data_pemasukan
    if (oldPemasukan.length > 0) {
      await db.insert(schema.dataPemasukan).values(
        oldPemasukan.map((t) => ({
          title: t.title,
          nominal: t.nominal,
          tanggal: fromDDMMYYYY(t.tanggal),
        })),
      );
    }

    // 4) data_pengeluaran
    if (oldPengeluaran.length > 0) {
      await db.insert(schema.dataPengeluaran).values(
        oldPengeluaran.map((t) => ({
          title: t.title,
          nominal: t.nominal,
          tanggal: fromDDMMYYYY(t.tanggal),
        })),
      );
    }

    console.log("✅ Migration completed successfully.");
  } finally {
    await mongo.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
