/**
 * Verifies that Neon Postgres is an EXACT mirror of the source MongoDB.
 * Builds a deep fingerprint from each source and compares:
 *   - data_user (names)
 *   - data_bulanan (months) + nested pembayaran + bulanan_user + denda
 *   - data_pemasukan / data_pengeluaran (title, nominal, tanggal DDMMYYYY)
 *
 * Run before migration to see the diff, and after to confirm 0 differences.
 *
 * Usage: npx tsx scripts/verify-migration.ts
 */
import dns from "node:dns";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { Pool } from "pg";

config({ path: [".env.local", ".env"] });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const pad2 = (n: number) => String(n).padStart(2, "0");

interface UserFP {
  nama: string;
  total_bayar: number;
  denda: string[]; // sorted MMYYYY
}
interface MonthFP {
  pembayaran: string[]; // sorted "title|nominal"
  users: UserFP[]; // sorted by nama
}
interface Fingerprint {
  users: string[]; // sorted names
  months: Record<string, MonthFP>; // key = MMYYYY
  pemasukan: string[]; // sorted "title|nominal|DDMMYYYY"
  pengeluaran: string[]; // sorted "title|nominal|DDMMYYYY"
}

function sortStr(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function mongoFingerprint(uri: string): Promise<Fingerprint> {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const mdb = client.db();
    const users = await mdb.collection("datausers").find({}).toArray();
    const bulanan = await mdb.collection("databulanans").find({}).toArray();
    const pemasukan = await mdb.collection("datapemasukans").find({}).toArray();
    const pengeluaran = await mdb
      .collection("datapengeluarans")
      .find({})
      .toArray();

    const months: Record<string, MonthFP> = {};
    for (const m of bulanan as any[]) {
      const key = m.tanggal; // "MMYYYY"
      const pembayaran = (m.pembayaran ?? [])
        .map((p: any) => `${p.title}|${p.nominal}`)
        .sort(sortStr);
      const usersFp: UserFP[] = (m.user ?? [])
        .map((u: any) => ({
          nama: u.nama,
          total_bayar: u.total_bayar ?? 0,
          denda: (u.denda ?? []).filter(Boolean).slice().sort(sortStr),
        }))
        .sort((a: UserFP, b: UserFP) => sortStr(a.nama, b.nama));
      months[key] = { pembayaran, users: usersFp };
    }

    return {
      users: (users as any[]).map((u) => u.nama).sort(sortStr),
      months,
      pemasukan: (pemasukan as any[])
        .map((t) => `${t.title}|${t.nominal}|${t.tanggal}`)
        .sort(sortStr),
      pengeluaran: (pengeluaran as any[])
        .map((t) => `${t.title}|${t.nominal}|${t.tanggal}`)
        .sort(sortStr),
    };
  } finally {
    await client.close();
  }
}

async function pgFingerprint(url: string): Promise<Fingerprint> {
  const pool = new Pool({ connectionString: url });
  try {
    const users = (await pool.query("SELECT nama FROM data_user")).rows;
    const months = (
      await pool.query("SELECT id, bulan, tahun FROM data_bulanan")
    ).rows;
    const pembayaran = (
      await pool.query(
        "SELECT data_bulanan_id, title, nominal FROM pembayaran",
      )
    ).rows;
    const bulananUser = (
      await pool.query(
        "SELECT id, data_bulanan_id, nama, total_bayar FROM bulanan_user",
      )
    ).rows;
    const denda = (
      await pool.query("SELECT bulanan_user_id, bulan, tahun FROM denda")
    ).rows;
    const pemasukan = (
      await pool.query(
        "SELECT title, nominal, to_char(tanggal,'DDMMYYYY') AS tgl FROM data_pemasukan",
      )
    ).rows;
    const pengeluaran = (
      await pool.query(
        "SELECT title, nominal, to_char(tanggal,'DDMMYYYY') AS tgl FROM data_pengeluaran",
      )
    ).rows;

    // month id -> MMYYYY
    const monthKeyById = new Map<number, string>();
    for (const m of months) {
      monthKeyById.set(m.id, `${pad2(m.bulan)}${m.tahun}`);
    }
    // bulanan_user id -> sorted MMYYYY denda list
    const dendaByUser = new Map<number, string[]>();
    for (const d of denda) {
      const arr = dendaByUser.get(d.bulanan_user_id) ?? [];
      arr.push(`${pad2(d.bulan)}${d.tahun}`);
      dendaByUser.set(d.bulanan_user_id, arr);
    }

    const monthsFp: Record<string, MonthFP> = {};
    for (const m of months) {
      monthsFp[`${pad2(m.bulan)}${m.tahun}`] = { pembayaran: [], users: [] };
    }
    for (const p of pembayaran) {
      const key = monthKeyById.get(p.data_bulanan_id)!;
      monthsFp[key].pembayaran.push(`${p.title}|${p.nominal}`);
    }
    for (const u of bulananUser) {
      const key = monthKeyById.get(u.data_bulanan_id)!;
      monthsFp[key].users.push({
        nama: u.nama,
        total_bayar: u.total_bayar,
        denda: (dendaByUser.get(u.id) ?? []).slice().sort(sortStr),
      });
    }
    for (const key of Object.keys(monthsFp)) {
      monthsFp[key].pembayaran.sort(sortStr);
      monthsFp[key].users.sort((a, b) => sortStr(a.nama, b.nama));
    }

    return {
      users: users.map((u) => u.nama).sort(sortStr),
      months: monthsFp,
      pemasukan: pemasukan
        .map((t) => `${t.title}|${t.nominal}|${t.tgl}`)
        .sort(sortStr),
      pengeluaran: pengeluaran
        .map((t) => `${t.title}|${t.nominal}|${t.tgl}`)
        .sort(sortStr),
    };
  } finally {
    await pool.end();
  }
}

function diffArrays(label: string, a: string[], b: string[], out: string[]) {
  const setA = new Map<string, number>();
  const setB = new Map<string, number>();
  for (const x of a) setA.set(x, (setA.get(x) ?? 0) + 1);
  for (const x of b) setB.set(x, (setB.get(x) ?? 0) + 1);
  for (const [k, c] of setA) {
    if ((setB.get(k) ?? 0) !== c)
      out.push(`  [${label}] only/more in MONGO: "${k}" (mongo=${c}, pg=${setB.get(k) ?? 0})`);
  }
  for (const [k, c] of setB) {
    if ((setA.get(k) ?? 0) !== c && !setA.has(k))
      out.push(`  [${label}] only in POSTGRES: "${k}" (pg=${c})`);
  }
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!MONGO_URI) throw new Error("MONGO_URI is not set in .env.local");
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set in .env.local");

  const mongo = await mongoFingerprint(MONGO_URI);
  const pg = await pgFingerprint(DATABASE_URL);

  const scalars = [
    ["users count", mongo.users.length, pg.users.length],
    ["months count", Object.keys(mongo.months).length, Object.keys(pg.months).length],
    ["pemasukan count", mongo.pemasukan.length, pg.pemasukan.length],
    ["pengeluaran count", mongo.pengeluaran.length, pg.pengeluaran.length],
  ] as const;

  const sumPemb = (fp: Fingerprint) =>
    Object.values(fp.months).reduce((a, m) => a + m.pembayaran.length, 0);
  const sumUsers = (fp: Fingerprint) =>
    Object.values(fp.months).reduce((a, m) => a + m.users.length, 0);
  const sumDenda = (fp: Fingerprint) =>
    Object.values(fp.months).reduce(
      (a, m) => a + m.users.reduce((b, u) => b + u.denda.length, 0),
      0,
    );
  const sumBayar = (fp: Fingerprint) =>
    Object.values(fp.months).reduce(
      (a, m) => a + m.users.reduce((b, u) => b + u.total_bayar, 0),
      0,
    );

  console.log("=== SCALAR METRICS (mongo vs pg) ===");
  let allMatch = true;
  const rows: Array<[string, number, number]> = [
    ...scalars.map((s) => [s[0], s[1], s[2]] as [string, number, number]),
    ["pembayaran total", sumPemb(mongo), sumPemb(pg)],
    ["bulanan_user total", sumUsers(mongo), sumUsers(pg)],
    ["denda total", sumDenda(mongo), sumDenda(pg)],
    ["sum(total_bayar)", sumBayar(mongo), sumBayar(pg)],
  ];
  for (const [label, mv, pv] of rows) {
    const ok = mv === pv;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? "OK " : "XX "} ${label}: mongo=${mv} pg=${pv}`);
  }

  const diffs: string[] = [];
  diffArrays("users", mongo.users, pg.users, diffs);
  diffArrays("pemasukan", mongo.pemasukan, pg.pemasukan, diffs);
  diffArrays("pengeluaran", mongo.pengeluaran, pg.pengeluaran, diffs);

  // month-by-month deep compare
  const allKeys = new Set([
    ...Object.keys(mongo.months),
    ...Object.keys(pg.months),
  ]);
  for (const key of allKeys) {
    const mm = mongo.months[key];
    const pm = pg.months[key];
    if (!mm) {
      diffs.push(`  [month ${key}] missing in MONGO (exists only in PG)`);
      continue;
    }
    if (!pm) {
      diffs.push(`  [month ${key}] MISSING in POSTGRES`);
      continue;
    }
    diffArrays(`month ${key} pembayaran`, mm.pembayaran, pm.pembayaran, diffs);
    const mu = mm.users.map((u) => `${u.nama}|${u.total_bayar}|${u.denda.join(",")}`);
    const pu = pm.users.map((u) => `${u.nama}|${u.total_bayar}|${u.denda.join(",")}`);
    diffArrays(`month ${key} users`, mu, pu, diffs);
  }

  console.log("\n=== DEEP DIFF ===");
  if (diffs.length === 0 && allMatch) {
    console.log("  ✅ EXACT MATCH — Postgres mirrors MongoDB perfectly.");
  } else {
    console.log(`  ❌ ${diffs.length} difference(s) found:`);
    for (const d of diffs.slice(0, 80)) console.log(d);
    if (diffs.length > 80) console.log(`  ... and ${diffs.length - 80} more`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
