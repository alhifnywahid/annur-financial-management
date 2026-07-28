<p align="center">
  <img src="./assets/readme/hero.svg" alt="Annur Official — manajemen keuangan asrama dengan TanStack Start, Neon Postgres, Drizzle, dan Better Auth" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TanStack_Start-1E3932?style=flat-square&logo=react&logoColor=white" alt="TanStack Start" />
  <img src="https://img.shields.io/badge/React_19-006241?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Neon_Postgres-00754A?style=flat-square&logo=postgresql&logoColor=white" alt="Neon Postgres" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-1E3932?style=flat-square&logo=drizzle&logoColor=white" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Better_Auth-00754A?style=flat-square" alt="Better Auth" />
  <img src="https://img.shields.io/badge/Tailwind_v4-006241?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/License-MIT-cba258?style=flat-square" alt="MIT License" />
</p>

<p align="center">
  <b>Bahasa Indonesia</b> &#183; <a href="./README.en.md">English</a>
</p>

---

**Annur Official** adalah aplikasi web untuk mengelola keuangan asrama atau komunitas kecil: mencatat iuran bulanan tiap anggota, memantau kas masuk dan keluar, serta melacak status pembayaran dan hutang, semuanya di satu tempat. Anggota bisa mengecek tagihannya sendiri, sementara pengurus mengelola seluruh data lewat panel admin.

Versi ini (**v2**) adalah hasil migrasi penuh dari Next.js + MongoDB ke **TanStack Start + Neon Postgres + Drizzle + Better Auth**, dengan tampilan dan alur yang tetap dipertahankan.

## Fitur

### Untuk Anggota

- Ringkasan tagihan yang harus dibayar pada bulan berjalan
- Riwayat pemasukan dan pengeluaran kas
- Status pembayaran dan hutang tiap anggota, per bulan
- Panduan pembayaran online lewat **QRIS**
- Panduan pembayaran offline lewat **WhatsApp**

### Untuk Admin

- Kelola data pemasukan dan pengeluaran (tambah, ubah, hapus)
- Kelola tagihan bulanan (komponen iuran wajib)
- Kelola anggota, termasuk **tambah, ubah nama, dan hapus**
- Rekap dan pantau data pembayaran seluruh anggota
- Akses admin dibatasi berdasarkan email (`ADMIN_EMAIL`) melalui Google OAuth

## Arsitektur

<p align="center">
  <img src="./assets/readme/architecture.svg" alt="Diagram arsitektur: Browser React 19 memanggil TanStack Start (SSR dan server functions), yang mengakses Neon Postgres lewat Drizzle ORM; Better Auth menangani Google OAuth; data lama MongoDB dipindahkan sekali lewat skrip migrate-data.ts" width="100%" />
</p>

UI React 19 berjalan di atas **TanStack Start**, yang menyediakan SSR sekaligus _server functions_, jadi tidak perlu lapisan REST API terpisah. Akses data dilakukan lewat **Drizzle ORM** yang _type-safe_ menuju **Neon Postgres** (serverless). Autentikasi ditangani **Better Auth** dengan Google OAuth. Data dari aplikasi lama (MongoDB) dipindahkan satu kali lewat skrip ETL `scripts/migrate-data.ts`.

## Teknologi

| Kategori      | Teknologi                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| Framework     | TanStack Start (React 19), TanStack Router / Query / Form / Store / Table |
| Database      | Neon Postgres (serverless)                                                |
| ORM & Migrasi | Drizzle ORM + drizzle-kit                                                 |
| Autentikasi   | Better Auth (Google OAuth)                                                |
| Styling       | Tailwind CSS v4, Radix UI                                                 |
| Ikon          | Lucide React, React Icons                                                 |
| Validasi      | Zod, `@t3-oss/env-core`                                                   |
| Tooling       | Vite, Biome (lint & format), Vitest                                       |
| Bahasa        | TypeScript                                                                |

## Struktur Proyek

```
annur-financial-management/
├── assets/readme/            # Aset visual untuk README (hero, arsitektur)
├── db/
│   └── init.sql              # Inisialisasi skema SQL awal
├── public/                   # Aset statis (logo, QRIS, favicon, manifest)
├── scripts/
│   ├── migrate-data.ts       # ETL satu kali: MongoDB -> Neon Postgres
│   └── verify-migration.ts   # Verifikasi Postgres cocok dengan sumber Mongo
├── src/
│   ├── components/           # Komponen UI (admin/, ui/, kartu, header)
│   ├── db/                   # Koneksi Drizzle + skema (schema.ts)
│   ├── integrations/         # Setup TanStack (Query, devtools)
│   ├── lib/                  # server functions, akses data, util, konfigurasi
│   ├── routes/               # Rute berbasis file (_user/, admin/)
│   ├── env.ts                # Validasi environment variable
│   ├── router.tsx            # Konfigurasi router
│   └── styles.css            # Style global (tema Tailwind)
├── drizzle.config.ts         # Konfigurasi Drizzle Kit
├── vite.config.ts            # Konfigurasi Vite
└── biome.json                # Konfigurasi Biome
```

## Prasyarat

- **Node.js** versi 20 atau lebih baru
- Database **Neon Postgres** (atau instance Postgres lain)
- Akun **Google Cloud** untuk kredensial OAuth

## Instalasi dan Menjalankan

**1. Clone repositori**

```bash
git clone https://github.com/alhifnywahid/annur-financial-management.git
cd annur-financial-management
```

**2. Install dependencies**

```bash
npm install
```

**3. Siapkan environment**

Salin `.env.example` menjadi `.env.local`, lalu isi nilainya (lihat [Konfigurasi Environment](#konfigurasi-environment)).

```bash
cp .env.example .env.local
```

**4. Siapkan skema database**

```bash
npm run db:push
```

**5. Jalankan server pengembangan**

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

**6. Build untuk produksi**

```bash
npm run build
npm run preview
```

## Konfigurasi Environment

Buat file `.env.local` di root proyek dan isi variabel berikut:

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
# Buat dengan: npx -y @better-auth/cli secret
BETTER_AUTH_SECRET=

# Google OAuth (Google Cloud Console)
# Authorized redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email yang diizinkan mengakses panel admin
ADMIN_EMAIL=admin@gmail.com
```

### Mendapatkan kredensial Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat atau pilih sebuah project
3. Aktifkan **Google Identity**
4. Buat **OAuth 2.0 Client ID** di bagian Credentials
5. Tambahkan `http://localhost:3000/api/auth/callback/google` ke **Authorized redirect URIs**

## Migrasi Data (opsional, satu kali)

Jika Anda memindahkan data dari aplikasi lama (MongoDB), tambahkan `MONGO_URI` di `.env.local`, lalu jalankan:

```bash
npm run migrate:data      # impor MongoDB -> Neon Postgres
npm run verify:migration  # pastikan hasilnya cocok dengan sumber
```

Hapus `MONGO_URI` setelah selesai. Perintah `db:generate`, `db:migrate`, dan `db:studio` juga tersedia untuk mengelola skema Drizzle.

## Versi

| Versi            | Stack                                                  | Referensi                                                                              |
| ---------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **v2** (terkini) | TanStack Start + Neon Postgres + Drizzle + Better Auth | branch `main`                                                                          |
| **v1**           | Next.js 14 + MongoDB + NextAuth                        | tag [`v1-nextjs`](https://github.com/alhifnywahid/annur-financial-management/releases) |

Kedua versi tersedia di repositori yang sama, jadi bisa di-deploy dari tag mana pun.

## Kontribusi

Kontribusi terbuka. Fork repositori, buat branch fitur (`git checkout -b fitur/nama-fitur`), commit perubahan, lalu buka Pull Request.

## Lisensi

Dirilis di bawah [MIT License](./LICENSE).
