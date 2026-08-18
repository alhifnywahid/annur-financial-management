/**
 * Single source of truth for "sudah lunas atau belum, dan kurang berapa".
 *
 * ATURANNYA — dan mengapa denda TIDAK ikut menentukan lunas:
 *
 *     lunas  = total_bayar >= total tagihan bulan itu   (denda TIDAK dihitung)
 *     kurang = lunas ? 0 : (tagihan - bayar) + denda
 *
 * Sekilas tiga tempat di app ini tampak memakai aturan berbeda (kartu anggota
 * pakai `bayar >= tagihan + denda`, halaman Hutang dan panel admin pakai
 * `bayar >= tagihan`). Itu terlihat seperti inkonsistensi, tapi bukan:
 * `updateDenda()` di data-access.ts menegakkan sebuah INVARIAN —
 *
 *     ada baris denda  =>  total_bayar < total tagihan
 *
 * karena setiap kali dihitung ulang, baris denda anggota yang sudah menutup
 * tagihan dihapus. Di bawah invarian itu ketiga rumus menghasilkan jawaban
 * yang sama, jadi tidak ada yang perlu "diseragamkan".
 *
 * JANGAN ubah `isLunas` jadi `bayar >= tagihan + denda`. Saya pernah
 * melakukannya dan itu merusak seluruh angka: denda dihitung per bulan yang
 * sudah berlalu, jadi untuk bulan 24 bulan lalu `owed` menjadi
 * 70.000 + 24x10.000 = 310.000. Anggota yang dulu membayar tagihannya dengan
 * benar mendadak dianggap belum lunas, lalu ikut diberi denda retroaktif untuk
 * tiap bulan yang berlalu. Hasilnya: baris denda melonjak dari 6 ke 1.441 dan
 * semua anggota tercatat berhutang jutaan rupiah. Denda adalah sanksi selama
 * seseorang MASIH menunggak; begitu tagihan ditutup, sanksinya berhenti.
 *
 * `kurang` tetap memasukkan denda, karena selama seseorang masih menunggak dia
 * memang berhutang kekurangan tagihan DITAMBAH dendanya.
 */

/** Denda per bulan keterlambatan, dalam rupiah. */
export const DENDA_PER_BULAN = 10_000;

/** Jumlah tagihan sebulan (Listrik + WIFI + apa pun yang admin tambahkan). */
export function totalTagihan(
	bills: ReadonlyArray<{ nominal: number }>,
): number {
	return bills.reduce((sum, bill) => sum + bill.nominal, 0);
}

/** Rupiah denda untuk `count` bulan keterlambatan. */
export function totalDenda(count: number): number {
	return count * DENDA_PER_BULAN;
}

export interface TagihanUser {
	/** Jumlah tagihan bulan itu. */
	tagihan: number;
	/** Total denda untuk bulan-bulan keterlambatan. */
	denda: number;
	/** Yang harus dibayar bila masih menunggak: `tagihan + denda`. */
	owed: number;
	/** Kekurangan: 0 bila lunas, selain itu `owed - bayar`. */
	kurang: number;
	/** True begitu anggota menutup TAGIHAN-nya (denda tidak ikut menentukan). */
	isLunas: boolean;
}

/**
 * Posisi satu anggota untuk satu bulan.
 *
 * `dendaCount` adalah jumlah bulan keterlambatan: baris `denda` tersimpan saat
 * membaca, atau `monthDiff` saat menghitungnya ulang.
 */
export function hitungTagihanUser(input: {
	bills: ReadonlyArray<{ nominal: number }>;
	dendaCount: number;
	totalBayar: number;
}): TagihanUser {
	const tagihan = totalTagihan(input.bills);
	const denda = totalDenda(input.dendaCount);
	const owed = tagihan + denda;
	const isLunas = input.totalBayar >= tagihan;

	return {
		tagihan,
		denda,
		owed,
		kurang: isLunas ? 0 : Math.max(0, owed - input.totalBayar),
		isLunas,
	};
}
