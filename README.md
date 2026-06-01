# SIMAR — Sistem Informasi dan Booking Ruangan

> Sistem manajemen jadwal dan peminjaman ruangan untuk Program Studi Informatika, Fakultas Teknologi Informasi dan Sains Data, Universitas Sebelas Maret (UNS).

## 📋 Fitur

### 👤 Fitur Publik (Mahasiswa / Dosen)

*   **Jadwal Ruangan Terintegrasi**
    *   Tabel jadwal mingguan interaktif yang menampilkan 11 ruangan kelas/lab.
    *   Mendukung 11 sesi per hari berdasarkan data dan kurikulum resmi program studi.
*   **Booking / Peminjaman Cerdas**
    *   Formulir peminjaman untuk ruangan dan sesi yang sedang kosong.
    *   Mendukung peminjaman lebih dari 1 sesi sekaligus (durasi panjang).
    *   **Validasi Real-time:** Mencegah terjadinya *double booking* atau bentrok jadwal pada tingkat database (*atomic booking*), sehingga aman saat diakses bersamaan.
*   **Pelacakan Status (Tracking)**
    *   Pencarian status peminjaman secara mandiri menggunakan **ID Booking** atau **NIM**.
    *   Status indikator yang jelas: `Pending` (menunggu), `Approved` (disetujui), atau `Rejected` (ditolak).
*   **Pencarian Ruangan Kosong**
    *   Halaman khusus untuk melihat ketersediaan slot kosong per hari.
    *   Dikelompokkan berdasarkan ruangan untuk mempercepat pencarian ruang yang tersedia.

### 🛡️ Fitur Administrator

*   **Admin Dashboard & Manajemen Peminjaman**
    *   Panel khusus yang dilindungi autentikasi (*session-based*).
    *   Fitur untuk me-*review*, **Approve** (menyetujui), atau **Reject** (menolak) permohonan peminjaman yang masuk.
*   **Manajemen Data (CRUD)**
    *   Hak akses penuh untuk meng-**Edit** detail peminjaman yang sudah ada atau men-**Delete** data peminjaman jika diperlukan.
*   **Lock Slot (Kunci Sesi)**
    *   Admin dapat mengunci/memblokir slot sesi tertentu di ruangan tertentu (misal: Ruang Lab A sesi ke-3 tidak bisa dipinjam).
*   **Lock Ruangan (Kunci Penuh)**
    *   Fitur untuk memblokir sebuah ruangan secara utuh.
    *   Mendukung opsi fleksibel: dikunci pada hari tertentu, dikunci secara mingguan, atau dikunci permanen (contoh: ruangan dalam perbaikan).
*   **Statistik & Inspeksi**
    *   Ringkasan data penggunaan ruangan dan fitur untuk menginspeksi ketersediaan slot secara cepat dari kacamata admin.

### ✨ UI/UX & Performa

*   **Responsive & Mobile-Friendly:** Antarmuka modern dengan Tailwind CSS, dilengkapi navigasi yang nyaman digunakan di *smartphone*.
*   **Keamanan Terjamin:** Menerapkan *Row Level Security (RLS)* di database dan enkripsi kata sandi Admin tingkat tinggi.

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Runtime | React 19, TypeScript 5 |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS 4 |
| Font | Plus Jakarta Sans |
| Auth | bcrypt + Session Token + Secure Cookie |

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Akun [Supabase](https://supabase.com) (free tier cukup)

### 1. Clone & Install

```bash
git clone <repo-url>
cd SIMAR
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard)
2. Buat tabel `bookings`, `locked_slots`, `locked_rooms` (sesuai schema)
3. Jalankan file `supabase-migration.sql` di SQL Editor Supabase
4. Catat URL, anon key, dan service role key dari Settings > API

### 3. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi:
- `NEXT_PUBLIC_SUPABASE_URL` — URL project Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key
- `ADMIN_PASSWORD_HASH` — Hash password admin (lihat di bawah)

### 4. Generate Password Hash

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('PASSWORD_ANDA', 12).then(h => console.log(h))"
```

Copy output hash dan paste ke `ADMIN_PASSWORD_HASH` di `.env.local`.

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## 🏗️ Struktur Project

```
src/
├── app/
│   ├── page.tsx              # Halaman utama (jadwal ruangan)
│   ├── layout.tsx            # Root layout
│   ├── admin/page.tsx        # Dashboard admin
│   ├── available/page.tsx    # Ruangan kosong
│   └── status/page.tsx       # Cek status booking
├── components/
│   ├── AdminDashboard.tsx    # Dashboard admin component
│   ├── AdminLogin.tsx        # Form login admin
│   ├── BookingModal.tsx      # Modal booking ruangan
│   ├── DaySelector.tsx       # Selector hari
│   ├── Header.tsx            # Navigation header
│   └── ScheduleTable.tsx     # Tabel jadwal
├── lib/
│   ├── actions.ts            # Server actions (API)
│   ├── auth-guard.ts         # Admin auth guard
│   ├── roomLocking.ts        # Lock ruangan logic
│   ├── scheduleData.ts       # Data jadwal resmi (hardcoded)
│   ├── store.ts              # CRUD operations (Supabase)
│   ├── supabase.ts           # Supabase client config
│   └── types.ts              # Type definitions
└── middleware.ts             # Route protection middleware
```

## 🔒 Security

- Password admin di-hash dengan bcrypt (12 rounds)
- Session token unik per login (crypto.randomUUID)
- Cookie: httpOnly, secure, sameSite: strict, maxAge: 8 jam
- Semua server action admin dilindungi `requireAdmin()` guard
- Row Level Security (RLS) di Supabase
- Dual Supabase client: anon (public) dan service role (admin)
- Middleware untuk proteksi route `/admin`

## 📦 Deploy (Vercel)

```bash
npm run build
```

Set environment variables di Vercel Dashboard, lalu deploy.

## 📄 License

Internal use — Program Studi Informatika, UNS.
