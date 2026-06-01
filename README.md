# SIMAR — Sistem Informasi dan Booking Ruangan

> Sistem manajemen jadwal dan peminjaman ruangan untuk Program Studi Informatika, Fakultas Teknologi Informasi dan Sains Data, Universitas Sebelas Maret (UNS).

## 📋 Fitur

| Fitur | Deskripsi |
|---|---|
| **Jadwal Ruangan** | Tabel jadwal mingguan 11 ruangan × 11 sesi berdasarkan data resmi prodi |
| **Booking Ruangan** | Form peminjaman ruangan kosong dengan validasi sesi, durasi, dan konflik |
| **Cek Status** | Pencarian booking by ID/NIM untuk cek status (pending/approved/rejected) |
| **Ruangan Kosong** | View slot tersedia per hari, dikelompokkan berdasarkan ruangan |
| **Admin Dashboard** | Review & approve/reject booking, statistik, inspeksi slot |
| **Lock Slot** | Admin mengunci slot tertentu (per sesi) |
| **Lock Ruangan** | Admin mengunci seluruh ruangan (per hari/minggu/permanen) |
| **Edit & Delete** | Admin mengedit data booking atau menghapus booking |
| **Responsive UI** | Mobile-friendly dengan hamburger menu |

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
