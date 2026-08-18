/**
 * Applies the two unique constraints added in src/db/schema.ts.
 *
 * Deliberately NOT `drizzle-kit push`: push wants an interactive answer and its
 * offered escape hatch is "truncate data_user", which would delete every member.
 * These two ALTER TABLEs are the entire schema delta and they only ADD a
 * constraint — no data is touched. Verifies emptiness of the duplicate sets
 * first, and is idempotent (skips a constraint that already exists).
 */
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"] });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env.local");

const pool = new Pool({ connectionString: url });

const CONSTRAINTS = [
	{
		name: "data_user_nama_unique",
		table: "data_user",
		sql: 'ALTER TABLE "data_user" ADD CONSTRAINT "data_user_nama_unique" UNIQUE("nama")',
		dupes: "SELECT nama FROM data_user GROUP BY nama HAVING count(*) > 1",
	},
	{
		name: "bulanan_user_bulanan_nama_unique",
		table: "bulanan_user",
		sql: 'ALTER TABLE "bulanan_user" ADD CONSTRAINT "bulanan_user_bulanan_nama_unique" UNIQUE("data_bulanan_id","nama")',
		dupes:
			"SELECT data_bulanan_id, nama FROM bulanan_user GROUP BY data_bulanan_id, nama HAVING count(*) > 1",
	},
];

for (const c of CONSTRAINTS) {
	const existing = await pool.query(
		"SELECT 1 FROM pg_constraint WHERE conname = $1",
		[c.name],
	);
	if (existing.rowCount) {
		console.log(`- ${c.name}: sudah ada, dilewati`);
		continue;
	}

	const dupes = await pool.query(c.dupes);
	if (dupes.rowCount) {
		console.error(
			`! ${c.name}: DIBATALKAN — ada ${dupes.rowCount} duplikat di ${c.table}:`,
		);
		for (const r of dupes.rows) console.error("   ", JSON.stringify(r));
		continue;
	}

	await pool.query(c.sql);
	console.log(`+ ${c.name}: terpasang di ${c.table}`);
}

await pool.end();
