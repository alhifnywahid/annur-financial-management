/**
 * Menyalin teks ke clipboard, dengan jalur cadangan untuk konteks non-secure.
 *
 * `navigator.clipboard` hanya tersedia di secure context (https atau localhost).
 * Aplikasi ini dibuka dari HP di jaringan lokal lewat http://<ip>:3000, dan di
 * sana API-nya tidak ada sama sekali — jadi ada fallback lewat `<textarea>` +
 * `document.execCommand("copy")`, yang usang tapi masih jalan di semua browser
 * yang relevan.
 *
 * Melempar error bila kedua jalur gagal, supaya pemanggilnya bisa menampilkan
 * pesan gagal alih-alih mengaku sudah tersalin.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return;
		} catch {
			// Bisa gagal karena izin ditolak atau dokumen tidak fokus — coba fallback.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	// Di luar viewport, dan read-only agar keyboard HP tidak muncul.
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.top = "-9999px";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);

	try {
		textarea.select();
		textarea.setSelectionRange(0, text.length);
		if (!document.execCommand("copy")) {
			throw new Error("Gagal menyalin ke clipboard.");
		}
	} finally {
		textarea.remove();
	}
}
