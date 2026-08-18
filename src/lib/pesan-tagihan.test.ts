import { describe, expect, it } from "vitest";

import { type BulanBelumBayar, buatPesanTagihan } from "./pesan-tagihan.ts";

/** 18 Agustus 2026, supaya tanggal di header pesan tidak ikut berubah. */
const NOW = new Date(2026, 7, 18);

function bulan(
	tanggal: string,
	users: Array<{ nama: string; kurang: number; denda?: number }>,
): BulanBelumBayar {
	return {
		tanggal,
		unpaidUsers: users.map((u) => ({
			nama: u.nama,
			kurang: u.kurang,
			denda: u.denda ?? 0,
		})),
	};
}

describe("buatPesanTagihan", () => {
	it("says everyone is settled when there is nothing outstanding", () => {
		const pesan = buatPesanTagihan([], NOW);
		expect(pesan).toContain("Semua anggota sudah lunas");
		expect(pesan).not.toContain("Total tunggakan");
	});

	it("treats months with no unpaid members as nothing outstanding", () => {
		const pesan = buatPesanTagihan([bulan("062026", [])], NOW);
		expect(pesan).toContain("Semua anggota sudah lunas");
	});

	it("dates the message and names the app", () => {
		const pesan = buatPesanTagihan(
			[bulan("062026", [{ nama: "Budi", kurang: 70_000 }])],
			NOW,
		);
		expect(pesan).toContain("*INFO TAGIHAN — Annur Official*");
		expect(pesan).toContain("_Per 18 Agustus 2026_");
	});

	it("groups a member's months under one heading with their total", () => {
		const pesan = buatPesanTagihan(
			[
				bulan("062026", [{ nama: "Budi", kurang: 80_000, denda: 10_000 }]),
				bulan("072026", [{ nama: "Budi", kurang: 70_000 }]),
			],
			NOW,
		);
		expect(pesan).toContain("*Budi* — Rp 150.000");
		expect(pesan).toContain(
			"• Juni 2026: Rp 80.000 (termasuk denda Rp 10.000)",
		);
		expect(pesan).toContain("• Juli 2026: Rp 70.000");
		// Namanya hanya muncul satu kali sebagai judul, tidak per bulan.
		expect(pesan.match(/\*Budi\*/g)).toHaveLength(1);
	});

	it("omits the penalty note for a month with no denda", () => {
		const pesan = buatPesanTagihan(
			[bulan("072026", [{ nama: "Budi", kurang: 70_000 }])],
			NOW,
		);
		expect(pesan).not.toContain("termasuk denda");
	});

	it("counts the members and totals every month", () => {
		const pesan = buatPesanTagihan(
			[
				bulan("062026", [
					{ nama: "Budi", kurang: 80_000, denda: 10_000 },
					{ nama: "Sri", kurang: 20_000 },
				]),
				bulan("072026", [{ nama: "Budi", kurang: 70_000 }]),
			],
			NOW,
		);
		expect(pesan).toContain("tunggakan (2 orang)");
		expect(pesan).toContain("*Total tunggakan: Rp 170.000*");
	});

	it("keeps members in first-seen order, oldest month first", () => {
		const pesan = buatPesanTagihan(
			[
				bulan("062026", [{ nama: "Sri", kurang: 70_000 }]),
				bulan("072026", [
					{ nama: "Budi", kurang: 70_000 },
					{ nama: "Sri", kurang: 70_000 },
				]),
			],
			NOW,
		);
		expect(pesan.indexOf("*Sri*")).toBeLessThan(pesan.indexOf("*Budi*"));
	});

	it("ends with the group invite for confirmation", () => {
		const pesan = buatPesanTagihan(
			[bulan("072026", [{ nama: "Budi", kurang: 70_000 }])],
			NOW,
		);
		expect(
			pesan
				.trimEnd()
				.endsWith("https://chat.whatsapp.com/FYOPWDI4YyNH4Y9k3BppUk"),
		).toBe(true);
	});
});
