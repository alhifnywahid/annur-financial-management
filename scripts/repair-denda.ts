/**
 * Recompute the denda table under the corrected rule and report the delta.
 *
 * Pass --apply to write. Without it, this only prints what would change.
 * Mirrors updateDenda() in src/lib/data-access.ts exactly: a member owes denda
 * for a past month only while that month's BILL is still uncovered.
 */
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"] });
const apply = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const now = new Date();
const nowIdx = now.getFullYear() * 12 + now.getMonth(); // 0-based month index

const months = (await pool.query("SELECT id, bulan, tahun FROM data_bulanan")).rows;
const bills = (await pool.query("SELECT data_bulanan_id, nominal FROM pembayaran"))
	.rows;
const users = (
	await pool.query("SELECT id, data_bulanan_id, nama, total_bayar FROM bulanan_user")
).rows;

const billTotal = new Map<number, number>();
for (const b of bills)
	billTotal.set(b.data_bulanan_id, (billTotal.get(b.data_bulanan_id) ?? 0) + b.nominal);

/** Desired denda rows, keyed by bulanan_user id. */
const desired: Array<{ uid: number; bulan: number; tahun: number }> = [];

for (const m of months) {
	const monthIdx = m.tahun * 12 + (m.bulan - 1);
	const difference = nowIdx - monthIdx;
	if (difference <= 0) continue; // current or future month is never late

	const tagihan = billTotal.get(m.id) ?? 0;

	for (const u of users.filter((x) => x.data_bulanan_id === m.id)) {
		if (u.total_bayar >= tagihan) continue; // bill covered -> no denda

		for (let i = difference; i >= 1; i--) {
			const idx = nowIdx - i;
			desired.push({
				uid: u.id,
				bulan: (idx % 12) + 1,
				tahun: Math.floor(idx / 12),
			});
		}
	}
}

const before = Number(
	(await pool.query("SELECT count(*)::int AS c FROM denda")).rows[0].c,
);
console.log(`denda rows sekarang : ${before}`);
console.log(`denda rows seharusnya: ${desired.length}`);

const perUser = new Map<number, number>();
for (const d of desired) perUser.set(d.uid, (perUser.get(d.uid) ?? 0) + 1);
const named = [...perUser].map(([uid, n]) => {
	const u = users.find((x) => x.id === uid);
	return `${u?.nama} (bulanan_user ${uid}): ${n} bulan`;
});
console.log("\nyang seharusnya punya denda:");
for (const l of named) console.log("  " + l);

if (!apply) {
	console.log("\n(dry run — jalankan dengan --apply untuk menulis)");
	await pool.end();
	process.exit(0);
}

const client = await pool.connect();
try {
	await client.query("BEGIN");
	await client.query("DELETE FROM denda");
	for (let i = 0; i < desired.length; i += 500) {
		const chunk = desired.slice(i, i + 500);
		const vals = chunk
			.map((_, j) => `($${j * 3 + 1},$${j * 3 + 2},$${j * 3 + 3})`)
			.join(",");
		const params = chunk.flatMap((d) => [d.uid, d.bulan, d.tahun]);
		await client.query(
			`INSERT INTO denda (bulanan_user_id, bulan, tahun) VALUES ${vals}`,
			params,
		);
	}
	await client.query("COMMIT");
	const after = Number(
		(await client.query("SELECT count(*)::int AS c FROM denda")).rows[0].c,
	);
	console.log(`\nselesai. denda rows: ${before} -> ${after}`);
} catch (e) {
	await client.query("ROLLBACK");
	throw e;
} finally {
	client.release();
	await pool.end();
}
