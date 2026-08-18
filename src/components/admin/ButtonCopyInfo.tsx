import { useEffect, useRef, useState } from "react";
import { MdCheck, MdContentCopy, MdErrorOutline } from "react-icons/md";

import { Button } from "#/components/ui/button";
import { copyToClipboard } from "#/lib/clipboard";
import { type BulanBelumBayar, buatPesanTagihan } from "#/lib/pesan-tagihan";

type Status = "idle" | "copied" | "error";

const LABEL: Record<Status, string> = {
	idle: "Copy Info",
	copied: "Tersalin!",
	error: "Gagal menyalin",
};

/** Berapa lama label sukses/gagal ditahan sebelum kembali ke "Copy Info". */
const RESET_DELAY = 2000;

/**
 * Menyalin rekap seluruh tunggakan ke clipboard dalam format siap-kirim ke
 * WhatsApp. Pesannya dibentuk di `src/lib/pesan-tagihan.ts`.
 */
export default function ButtonCopyInfo({
	months,
}: {
	months: readonly BulanBelumBayar[];
}) {
	const [status, setStatus] = useState<Status>("idle");
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Kalau halaman ditinggalkan sebelum label kembali normal, timernya dibuang
	// supaya tidak setState di komponen yang sudah tidak terpasang.
	useEffect(() => () => clearTimeout(timer.current), []);

	const handleClick = async () => {
		clearTimeout(timer.current);
		try {
			await copyToClipboard(buatPesanTagihan(months));
			setStatus("copied");
		} catch {
			setStatus("error");
		}
		timer.current = setTimeout(() => setStatus("idle"), RESET_DELAY);
	};

	const jumlah = new Set(
		months.flatMap((m) => m.unpaidUsers.map((u) => u.nama)),
	).size;

	return (
		<Button
			type="button"
			variant="outline"
			disabled={jumlah === 0}
			onClick={handleClick}
			// aria-live agar pembaca layar mengumumkan hasilnya, karena satu-satunya
			// umpan balik adalah label tombol itu sendiri.
			aria-live="polite"
		>
			{status === "copied" ? (
				<MdCheck aria-hidden="true" />
			) : status === "error" ? (
				<MdErrorOutline aria-hidden="true" />
			) : (
				<MdContentCopy aria-hidden="true" />
			)}
			{status === "idle" && jumlah > 0
				? `Copy Info (${jumlah} orang)`
				: LABEL[status]}
		</Button>
	);
}
