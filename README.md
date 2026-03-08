# Annur Official

Sistem manajemen keuangan berbasis web untuk lingkungan asrama, dibangun dengan Next.js 14 dan MongoDB. Aplikasi ini memudahkan pengelolaan pembayaran bulanan, pencatatan pemasukan dan pengeluaran, serta pemantauan status hutang anggota.

[Read in English](./README.en.md)

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Proyek](#struktur-proyek)
- [Prasyarat](#prasyarat)
- [Instalasi dan Penggunaan](#instalasi-dan-penggunaan)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang Proyek

Annur Official adalah aplikasi web full-stack yang dirancang untuk mempermudah pengelolaan keuangan di lingkungan asrama atau komunitas. Aplikasi ini menyediakan dua jenis akses: **Admin** untuk pengelolaan data secara menyeluruh, dan **User** untuk melihat informasi tagihan dan status pembayaran secara mandiri.

Autentikasi dilakukan melalui Google OAuth sehingga akses terbatas hanya pada akun yang telah diotorisasi. Seluruh data disimpan di MongoDB Atlas.

---

## Fitur Utama

### Panel Pengguna (User)
- Melihat ringkasan tagihan yang harus dibayar pada bulan berjalan
- Memantau riwayat pemasukan dan pengeluaran tambahan
- Melihat status hutang setiap anggota secara real-time
- Panduan pembayaran online melalui QRIS
- Panduan pembayaran offline melalui WhatsApp

### Panel Admin
- Menambah, mengedit, dan menghapus data pemasukan bulanan
- Menambah, mengedit, dan menghapus data pengeluaran bulanan
- Mengelola data tagihan (pembayaran wajib per bulan)
- Manajemen data pengguna/anggota
- Melihat rekap data pembayaran

---

## Teknologi yang Digunakan

| Kategori | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | MongoDB + Mongoose |
| Autentikasi | NextAuth.js v5 (Google OAuth) |
| UI Components | Radix UI, shadcn/ui |
| Styling | Tailwind CSS |
| Icons | Lucide React, React Icons |
| Date Handling | Moment.js, date-fns |
| Progress Bar | next-nprogress-bar |
| Package Manager | Yarn |

---

## Struktur Proyek

```
annur-official/
├── public/
│   └── qris.png                  # Gambar QRIS untuk pembayaran
├── src/
│   ├── app/
│   │   ├── (user)/               # Halaman untuk pengguna umum
│   │   │   ├── page.jsx          # Halaman utama (pemasukan & pengeluaran)
│   │   │   ├── bayar/            # Halaman tagihan & cara pembayaran
│   │   │   ├── data/             # Halaman rekap data
│   │   │   └── hutang/           # Halaman daftar hutang anggota
│   │   ├── admin/                # Halaman khusus admin
│   │   │   ├── page.jsx          # Dashboard admin
│   │   │   ├── data-pembayaran/  # Kelola data pembayaran
│   │   │   ├── data-user/        # Kelola data pengguna
│   │   │   ├── tagihan/          # Kelola tagihan bulanan
│   │   │   └── components-admin/ # Komponen khusus admin
│   │   └── api/                  # API Routes
│   │       ├── auth/             # Endpoint autentikasi
│   │       ├── data-bulanan/     # API data keuangan bulanan
│   │       ├── data-user/        # API data pengguna
│   │       ├── add-payment/      # API tambah pembayaran
│   │       ├── action-add/       # API tambah data
│   │       ├── edit-action/      # API edit data
│   │       └── delete-action/    # API hapus data
│   ├── components/               # Komponen UI yang dapat digunakan ulang
│   ├── lib/
│   │   ├── config.js             # Konfigurasi global aplikasi
│   │   └── mongoose.js           # Koneksi database MongoDB
│   ├── models/                   # Mongoose Schema
│   │   ├── DataBulanan.js        # Schema data keuangan bulanan
│   │   ├── DataPemasukan.js      # Schema data pemasukan
│   │   ├── DataPengeluaran.js    # Schema data pengeluaran
│   │   └── DataUser.js           # Schema data pengguna
│   └── utils/                    # Fungsi utilitas
├── auth.js                       # Konfigurasi NextAuth
├── middleware.js                 # Middleware autentikasi
├── next.config.mjs               # Konfigurasi Next.js
└── tailwind.config.js            # Konfigurasi Tailwind CSS
```

---

## Prasyarat

Pastikan perangkat Anda telah memiliki:

- **Node.js** versi 18 atau lebih baru
- **Yarn** sebagai package manager
- **MongoDB Atlas** atau MongoDB instance lokal
- Akun **Google Cloud** untuk konfigurasi OAuth

---

## Instalasi dan Penggunaan

**1. Clone repositori ini**

```bash
git clone https://github.com/username/annur-official.git
cd annur-official
```

**2. Install dependencies**

```bash
yarn install
```

**3. Buat file `.env.local`** dan isi dengan variabel lingkungan yang diperlukan (lihat bagian [Konfigurasi Environment](#konfigurasi-environment)).

**4. Jalankan server pengembangan**

```bash
yarn dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

**5. Build untuk produksi**

```bash
yarn build
yarn start
```

---

## Konfigurasi Environment

Buat file `.env.local` di root proyek dan isi dengan variabel berikut:

```env
# URL publik aplikasi (gunakan http://localhost:3000 untuk development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000/api

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nama-database

# Google OAuth (dari Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000

# Email akun yang diizinkan mengakses sebagai admin
EMAIL=admin@gmail.com
```

### Cara mendapatkan Google OAuth credentials:
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan **Google+ API** / **Google Identity**
4. Buat **OAuth 2.0 Client ID** di bagian Credentials
5. Tambahkan `http://localhost:3000/api/auth/callback/google` ke daftar **Authorized redirect URIs**

---

## Kontribusi

Kontribusi sangat terbuka dan disambut dengan baik. Berikut langkah-langkahnya:

1. Fork repositori ini
2. Buat branch baru (`git checkout -b fitur/nama-fitur`)
3. Commit perubahan Anda (`git commit -m 'feat: tambah fitur baru'`)
4. Push ke branch Anda (`git push origin fitur/nama-fitur`)
5. Buka Pull Request

---

## Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat file [LICENSE](./LICENSE) untuk informasi lebih lanjut.
