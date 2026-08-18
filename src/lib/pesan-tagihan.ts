/**
 * Menyusun rekap tunggakan menjadi satu pesan siap-kirim ke WhatsApp.
 *
 * Rekapnya dikelompokkan per ANGGOTA, bukan per bulan. Di halaman admin
 * pengelompokan per bulan masuk akal (admin mencatat pembayaran satu bulan
 * sekaligus), tapi pesan ini dibaca di grup: setiap orang mencari namanya lalu
 * ingin langsung tahu total yang harus dia bayar. Rincian bulannya tetap ada di
 * bawah namanya.
 *
 * Angka `kurang` sudah termasuk denda (lihat `src/lib/tagihan.ts`), jadi bila
 * ada denda, jumlahnya disebutkan dalam tanda kurung supaya tidak terkesan
 * tagihannya naik sendiri.
 *
 * Konfirmasi pembayaran diarahkan ke grup WhatsApp, bukan nomor pribadi, supaya
 * semua anggota melihat konfirmasinya.
 *
 * Markup yang dipakai hanya `*tebal*` dan `_miring_` — keduanya aman di
 * WhatsApp, dan kalau pesannya berakhir di aplikasi lain pun masih terbaca.
 */

import web from "./config.ts";
import { formatMonthYear, formatTanggalPanjang } from "./date.ts";
import { numberToIdr } from "./toIDR.ts";

export interface AnggotaBelumBayar {
	nama: string;
	/** Kekurangan bulan itu, sudah termasuk denda. */
	kurang: number;
	/** Rupiah denda yang ikut di dalam `kurang` (0 bila tidak terlambat). */
	denda: number;
}

export interface BulanBelumBayar {
	/** "MMYYYY" */
	tanggal: string;
	unpaidUsers: AnggotaBelumBayar[];
}

const GARIS = "──────────────";

/**
 * @param months Bulan-bulan yang masih punya tunggakan, terurut dari yang
 *   paling lama (persis seperti keluaran `getUnpaidMonths` di halaman admin).
 * @param now Tanggal pembuatan pesan; bisa diisi untuk keperluan tes.
 */
export function buatPesanTagihan(
	months: readonly BulanBelumBayar[],
	now: Date = new Date(),
): string {
	const tanggal = formatTanggalPanjang(now);
	const perAnggota = kelompokkanPerAnggota(months);

	if (perAnggota.length === 0) {
		return [
			`*INFO TAGIHAN — ${web.title}*`,
			`_Per ${tanggal}_`,
			"",
			"Semua anggota sudah lunas. Terima kasih! 🎉",
		].join("\n");
	}

	const total = perAnggota.reduce((sum, a) => sum + a.total, 0);
	const baris: string[] = [
		`*INFO TAGIHAN — ${web.title}*`,
		`_Per ${tanggal}_`,
		"",
		`Berikut anggota yang masih memiliki tunggakan (${perAnggota.length} orang):`,
		"",
	];

	for (const anggota of perAnggota) {
		baris.push(`*${anggota.nama}* — ${numberToIdr(anggota.total)}`);
		for (const bulan of anggota.bulan) {
			const denda =
				bulan.denda > 0 ? ` (termasuk denda ${numberToIdr(bulan.denda)})` : "";
			baris.push(
				`• ${formatMonthYear(bulan.tanggal)}: ${numberToIdr(bulan.kurang)}${denda}`,
			);
		}
		baris.push("");
	}

	baris.push(
		GARIS,
		`*Total tunggakan: ${numberToIdr(total)}*`,
		"",
		"Mohon segera diselesaikan ya 🙏",
		`Konfirmasi pembayaran di grup: ${web.link_grup_wa}`,
	);

	return baris.join("\n");
}

interface RekapAnggota {
	nama: string;
	total: number;
	bulan: Array<{ tanggal: string; kurang: number; denda: number }>;
}

/**
 * Membalik pengelompokan bulan -> anggota menjadi anggota -> bulan, dengan
 * urutan anggota mengikuti kemunculan pertamanya (bulan terlama lebih dulu),
 * sama seperti `hitungHutang`.
 */
function kelompokkanPerAnggota(
	months: readonly BulanBelumBayar[],
): RekapAnggota[] {
	const rekap = new Map<string, RekapAnggota>();

	for (const month of months) {
		for (const user of month.unpaidUsers) {
			let anggota = rekap.get(user.nama);
			if (!anggota) {
				anggota = { nama: user.nama, total: 0, bulan: [] };
				rekap.set(user.nama, anggota);
			}
			anggota.total += user.kurang;
			anggota.bulan.push({
				tanggal: month.tanggal,
				kurang: user.kurang,
				denda: user.denda,
			});
		}
	}

	return [...rekap.values()];
}
