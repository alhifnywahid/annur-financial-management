/**
 * Backup seluruh isi database ke satu file JSON (data-only; skema ada di
 * src/db/schema.ts dan dikelola drizzle-kit).
 *
 * Usage:
 *   node scripts/backup-db.mjs                 # -> backups/backup-<timestamp>.json
 *   node scripts/backup-db.mjs --out lokasi.json
 *
 * Pulihkan dengan: node scripts/restore-db.mjs backups/backup-<timestamp>.json
 * (VERIFY dulu isi file sebelum restore; restore menimpa SEMUA data.)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env.local");

const pg = await import("pg");
const pool = new pg.Pool({ connectionString: url });

// Urutan insert aman terhadap FK (auth tables terakhir: terpisah dari domain).
const TABLES = [
	"data_user",
	"data_bulanan",
	"pembayaran",
	"bulanan_user",
	"denda",
	"data_pemasukan",
	"data_pengeluaran",
	"user",
	"session",
	"account",
	"verification",
];

const outArg = process.argv.indexOf("--out");
const outFile =
	outArg > -1
		? process.argv[outArg + 1]
		: path.join(
				"backups",
				`backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
			);

const dump = { createdAt: new Date().toISOString(), tables: {} };

for (const table of TABLES) {
	const res = await pool.query(`SELECT * FROM "${table}" ORDER BY 1`);
	dump.tables[table] = {
		columns: res.fields.map((f) => f.name),
		rows: res.rows,
	};
	console.log(`- ${table}: ${res.rowCount} baris`);
}

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(dump, null, 2));

const total = Object.values(dump.tables).reduce((a, t) => a + t.rows.length, 0);
console.log(`\nBackup ${total} baris -> ${outFile}`);
await pool.end();
