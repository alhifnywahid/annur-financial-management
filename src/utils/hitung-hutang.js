function hitungHutang(dataBulanan) {
	let data = [];

	dataBulanan.forEach((v) => {
		const totalTagihan = v.pembayaran.reduce((a, b) => a + b.nominal, 0);
		v.user.forEach((user) => {
			// Lewati user yang sudah lunas di bulan ini
			if (user.total_bayar >= totalTagihan) return;

			const isNolDenda = user.denda.length === 0;
			const totalDenda = isNolDenda ? 0 : user.denda.length * 10000;
			const pembayaranPerBulan = totalTagihan - user.total_bayar;
			const hutangBulanIni = pembayaranPerBulan + totalDenda;

			const existing = data.find((d) => d.nama === user.nama);
			if (existing) {
				existing.nominal += hutangBulanIni;
			} else {
				data.push({
					nama: user.nama,
					nominal: hutangBulanIni,
				});
			}
		});
	});

	return data;
}

export default hitungHutang;
