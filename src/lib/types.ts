/**
 * Wire/DTO shapes returned by the server functions. These intentionally mirror
 * the JSON the old Next.js API produced (Mongo-shaped, embedded arrays,
 * `tanggal` as "MMYYYY"/"DDMMYYYY" strings) so the ported UI and the financial
 * calculations remain identical to the original app.
 */

export interface PembayaranDTO {
	_id: number;
	title: string;
	nominal: number;
}

export interface BulananUserDTO {
	_id: number;
	nama: string;
	total_bayar: number;
	/** Late months as "MMYYYY" strings (e.g. ["042026", "032026"]). */
	denda: string[];
}

export interface DataBulananDTO {
	_id: number;
	/** "MMYYYY" */
	tanggal: string;
	pembayaran: PembayaranDTO[];
	user: BulananUserDTO[];
}

export interface TransaksiDTO {
	_id: number;
	title: string;
	nominal: number;
	/** "DDMMYYYY" */
	tanggal: string;
}

export interface HutangDTO {
	nama: string;
	nominal: number;
}

export interface DataUserDTO {
	_id: number;
	nama: string;
}

export interface DataBulananResponse {
	/** ISO timestamp of when this payload was computed (debug aid). */
	generatedAt: string;
	status: boolean;
	listTagihan: PembayaranDTO[];
	dataBulanan: DataBulananDTO[];
	dataPengeluaran: TransaksiDTO[];
	dataPemasukan: TransaksiDTO[];
	totalSaldo: number;
	listHutang: HutangDTO[];
}
