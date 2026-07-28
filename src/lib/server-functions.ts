import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
  bulananUser,
  dataBulanan,
  dataPemasukan,
  dataPengeluaran,
  dataUser,
  pembayaran,
} from "#/db/schema";
import { getSession, requireAdmin } from "./auth-helpers";
import {
  checkNowMonth,
  getAllDataBulananDTO,
  getAllPemasukanDTO,
  getAllPengeluaranDTO,
} from "./data-access";
import { fromMMYYYY } from "./date";
import { hitungHutang } from "./hitung-hutang";
import type { DataBulananResponse, DataUserDTO } from "./types";

/* -------------------------------------------------------------------------- */
/*  Auth: session view for the admin UI gate                                   */
/* -------------------------------------------------------------------------- */

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession();
    if (!session?.user) return { authed: false as const, user: null };
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = !adminEmail || session.user.email === adminEmail;
    return {
      authed: isAdmin,
      user: isAdmin
        ? { name: session.user.name, email: session.user.email }
        : null,
    };
  },
);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Parse a "YYYY-MM-DD" (from <input type="date">) into a Date. */
function parseDateInput(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Tanggal tidak valid");
  }
  return d;
}

/* -------------------------------------------------------------------------- */
/*  GET data-bulanan  (the main aggregate read)                                */
/* -------------------------------------------------------------------------- */

export const getDataBulanan = createServerFn({ method: "GET" }).handler(
  async (): Promise<DataBulananResponse> => {
    await checkNowMonth();

    const [dataBulananDTO, dataPemasukanDTO, dataPengeluaranDTO] =
      await Promise.all([
        getAllDataBulananDTO(),
        getAllPemasukanDTO(),
        getAllPengeluaranDTO(),
      ]);

    const uangMasuk = dataPemasukanDTO.reduce((a, b) => a + b.nominal, 0);
    const uangKeluar = dataPengeluaranDTO.reduce((a, b) => a + b.nominal, 0);
    const hitungDataBulan = dataBulananDTO
      .map((data) => data.user.map((u) => u.total_bayar))
      .flat()
      .reduce((a, b) => a + b, 0);

    const totalSaldo = hitungDataBulan + uangMasuk - uangKeluar;
    const listHutang = hitungHutang(dataBulananDTO);
    const listTagihan = dataBulananDTO.map((d) => d.pembayaran).flat();

    return {
      a: new Date().toISOString(),
      status: true,
      listTagihan,
      dataBulanan: dataBulananDTO,
      dataPengeluaran: dataPengeluaranDTO,
      dataPemasukan: dataPemasukanDTO,
      totalSaldo,
      listHutang,
    };
  },
);

/* -------------------------------------------------------------------------- */
/*  Data User                                                                  */
/* -------------------------------------------------------------------------- */

export const getDataUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<DataUserDTO[]> => {
    const rows = await db.select().from(dataUser);
    return rows.map((r) => ({ _id: r.id, nama: r.nama }));
  },
);

export const addDataUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ nama: z.string().min(1) }))
  .handler(async ({ data }): Promise<DataUserDTO> => {
    await requireAdmin();
    const [row] = await db
      .insert(dataUser)
      .values({ nama: data.nama })
      .returning();
    return { _id: row.id, nama: row.nama };
  });

export const deleteDataUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ _id: z.coerce.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    // Removes the member from the master list only. Historical monthly records
    // (bulanan_user) reference members by name and are intentionally left
    // intact; the member simply won't be seeded into future months.
    const deleted = await db
      .delete(dataUser)
      .where(eq(dataUser.id, data._id))
      .returning();
    if (deleted.length === 0) throw new Error("User tidak ditemukan");
    return { message: "User berhasil dihapus" };
  });

export const editDataUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ _id: z.coerce.number(), nama: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const newName = data.nama.trim();
    if (!newName) throw new Error("Nama tidak boleh kosong");

    const [target] = await db
      .select()
      .from(dataUser)
      .where(eq(dataUser.id, data._id));
    if (!target) throw new Error("User tidak ditemukan");

    const oldName = target.nama;
    if (newName === oldName) return { message: "Tidak ada perubahan" };

    // Rename in the master list AND cascade to every monthly record so the
    // member is renamed consistently everywhere (payment matching uses `nama`).
    await db.transaction(async (tx) => {
      await tx
        .update(dataUser)
        .set({ nama: newName })
        .where(eq(dataUser.id, data._id));
      await tx
        .update(bulananUser)
        .set({ nama: newName })
        .where(eq(bulananUser.nama, oldName));
    });

    return { message: "User berhasil diperbarui" };
  });

/* -------------------------------------------------------------------------- */
/*  Pemasukan / Pengeluaran  (action-add, edit-action, delete-action)          */
/* -------------------------------------------------------------------------- */

const transaksiType = z.enum(["pengeluaran", "masukan", "pemasukan"]);

export const addTransaksi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: transaksiType,
      title: z.string().min(1),
      nominal: z.coerce.number(),
      tanggal: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const values = {
      title: data.title,
      nominal: data.nominal,
      tanggal: parseDateInput(data.tanggal),
    };
    if (data.type === "pengeluaran") {
      await db.insert(dataPengeluaran).values(values);
      return { message: "Pengeluaran berhasil ditambahkan" };
    }
    await db.insert(dataPemasukan).values(values);
    return { message: "Pemasukan berhasil ditambahkan" };
  });

export const editTransaksi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      _id: z.coerce.number(),
      type: transaksiType,
      title: z.string().min(1),
      nominal: z.coerce.number(),
      tanggal: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const values = {
      title: data.title,
      nominal: data.nominal,
      tanggal: parseDateInput(data.tanggal),
    };
    const isPengeluaran = data.type === "pengeluaran";
    const table = isPengeluaran ? dataPengeluaran : dataPemasukan;
    const label = isPengeluaran ? "Pengeluaran" : "Pemasukan";

    const updated = await db
      .update(table)
      .set(values)
      .where(eq(table.id, data._id))
      .returning();

    if (updated.length === 0) {
      throw new Error(`${label} tidak ditemukan`);
    }
    return { message: `${label} berhasil diperbarui` };
  });

export const deleteTransaksi = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      _id: z.coerce.number(),
      type: transaksiType,
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const isPengeluaran = data.type === "pengeluaran";
    const table = isPengeluaran ? dataPengeluaran : dataPemasukan;
    const label = isPengeluaran ? "Pengeluaran" : "Pemasukan";

    const deleted = await db
      .delete(table)
      .where(eq(table.id, data._id))
      .returning();

    if (deleted.length === 0) {
      throw new Error(`${label} tidak ditemukan`);
    }
    return { message: `${label} berhasil dihapus` };
  });

/* -------------------------------------------------------------------------- */
/*  Add payment  (add-payment)                                                 */
/* -------------------------------------------------------------------------- */

export const addPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      nominal: z.coerce.number(),
      tanggal: z.string().min(1), // "MMYYYY"
      user: z.string().min(1), // member name
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { bulan, tahun } = fromMMYYYY(data.tanggal);

    const month = await db.query.dataBulanan.findFirst({
      where: and(eq(dataBulanan.bulan, bulan), eq(dataBulanan.tahun, tahun)),
    });
    if (!month) throw new Error("Data tidak ditemukan");

    const target = await db.query.bulananUser.findFirst({
      where: and(
        eq(bulananUser.dataBulananId, month.id),
        eq(bulananUser.nama, data.user),
      ),
    });
    if (!target) throw new Error("Data tidak ditemukan");

    await db
      .update(bulananUser)
      .set({ totalBayar: target.totalBayar + data.nominal })
      .where(eq(bulananUser.id, target.id));

    return {
      message: `Pembayaran berhasil ditambahkan ke ${data.user} pada bulan ${data.tanggal}`,
    };
  });

/* -------------------------------------------------------------------------- */
/*  Tagihan CRUD  (operates on the month's `pembayaran` rows)                  */
/*  These were "Fitur belum tersedia!" stubs in the old app; now implemented.  */
/* -------------------------------------------------------------------------- */

export const addTagihan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      nominal: z.coerce.number(),
      tanggal: z.string().min(1).optional(), // "MMYYYY"; defaults to current month
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    let monthId: number;

    if (data.tanggal) {
      const { bulan, tahun } = fromMMYYYY(data.tanggal);
      const month = await db.query.dataBulanan.findFirst({
        where: and(eq(dataBulanan.bulan, bulan), eq(dataBulanan.tahun, tahun)),
      });
      if (!month) throw new Error("Bulan tidak ditemukan");
      monthId = month.id;
    } else {
      const now = new Date();
      const month = await db.query.dataBulanan.findFirst({
        where: and(
          eq(dataBulanan.bulan, now.getMonth() + 1),
          eq(dataBulanan.tahun, now.getFullYear()),
        ),
      });
      if (!month) throw new Error("Bulan tidak ditemukan");
      monthId = month.id;
    }

    await db.insert(pembayaran).values({
      dataBulananId: monthId,
      title: data.title,
      nominal: data.nominal,
    });
    return { message: "Tagihan berhasil ditambahkan" };
  });

export const editTagihan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      _id: z.coerce.number(),
      title: z.string().min(1),
      nominal: z.coerce.number(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const updated = await db
      .update(pembayaran)
      .set({ title: data.title, nominal: data.nominal })
      .where(eq(pembayaran.id, data._id))
      .returning();
    if (updated.length === 0) throw new Error("Tagihan tidak ditemukan");
    return { message: "Tagihan berhasil diperbarui" };
  });

export const deleteTagihan = createServerFn({ method: "POST" })
  .inputValidator(z.object({ _id: z.coerce.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const deleted = await db
      .delete(pembayaran)
      .where(eq(pembayaran.id, data._id))
      .returning();
    if (deleted.length === 0) throw new Error("Tagihan tidak ditemukan");
    return { message: "Tagihan berhasil dihapus" };
  });
