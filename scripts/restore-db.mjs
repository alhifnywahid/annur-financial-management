/**
 * Restore seluruh isi database dari file JSON buatan scripts/backup-db.mjs.
 * MENIMPA SEMUA DATA: setiap tabel di-TRUNCATE lalu diisi ulang dari file,
 * dan sequence serial di-set ulang ke id maksimum.
 *
 * Usage:
 *   node scripts/restore-db.mjs backups/backup-<timestamp>.json
 */
import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const file = process.argv[2];
if (!file) throw new Error("Pemakaian: node scripts/restore-db.mjs <file-backup.json>");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env.local");

const pg = await import("pg");
const pool = new pg.Pool({ connectionString: url });

const dump = JSON.parse(await readFile(file, "utf8"));
const tables = Object.keys(dump.tables);

const client = await pool.connect();
try {
	await client.query("BEGIN");
	// Domain tables dulu (denda <- bulanan_user <- data_bulanan), lalu auth.
	for (const table of tables) {
		const del = await client.query(`DELETE FROM "${table}"`);
		console.log(`- ${table}: dikosongkan (${del.rowCount} baris lama)`);
	}
	for (const table of tables) {
		const { columns, rows } = dump.tables[table];
		if (rows.length === 0) continue;
		const cols = columns.map((c) => `"${c}"`).join(", ");
		for (let i = 0; i < rows.length; i += 500) {
			const chunk = rows.slice(i, i + 500);
			const values = [];
			const params = [];
			chunk.forEach((row, r) => {
				const placeholders = columns.map((c, j) => {
					params.push(row[c]);
					return `$${params.length}`;
				});
				values.push(`(${placeholders.join(", ")})`);
			});
			await client.query(
				`INSERT INTO "${table}" (${cols}) VALUES ${values.join(", ")}`,
				params,
			);
		}
		for (const column of columns) {
			await client.query(
				`SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'),
				       COALESCE((SELECT MAX("${column}") FROM "${table}"), 0) + 1, false)`,
			);
		}
		console.log(`+ ${table}: ${rows.length} baris dipulihkan`);
	}
	await client.query("COMMIT");
	console.log("\nRESTORE COMMIT ✅");
} catch (e) {
	await client.query("ROLLBACK");
	console.error("\nROLLBACK — database tidak diubah ❌:", e.message);
	process.exitCode = 1;
} finally {
	client.release();
	await pool.end();
}
