# SIMAR — Sistem Informasi Manajemen dan Booking Ruangan

SIMAR adalah sistem informasi terpadu untuk digitalisasi jadwal dan peminjaman ruangan perkuliahan. Sistem ini dirancang untuk mencegah bentrok jadwal, meningkatkan transparansi fasilitas, dan menyederhanakan administrasi operasional program studi.

## ⚙️ Arsitektur & Teknologi

- **Frontend & Backend**: Next.js 15 (App Router) dengan bahasa pemrograman TypeScript 5.
- **Database & ORM**: PostgreSQL (direkomendasikan via Neon) yang dikelola melalui Prisma.
- **Tampilan (UI/UX)**: Tailwind CSS v4.
- **Keamanan**: Autentikasi sesi berbasis database, enkripsi *password* dengan `bcrypt`, dan mekanisme proteksi *Brute-Force*.
- **Otomatisasi**: Vercel Cron Jobs untuk pemeliharaan rutin.

---

## 🔄 Alur Kerja Sistem (System Workflow)

### 1. Alur Peminjaman (Pengguna Umum)
1. **Cek Ketersediaan**: Pengguna mengakses papan jadwal interaktif untuk melihat slot yang kosong (berwarna abu-abu).
2. **Pengajuan Peminjaman**: Pengguna mengklik slot tersebut dan mengisi formulir peminjaman. Sistem akan memvalidasi ketersediaan secara *real-time*.
3. **Pelacakan Status**: Peminjam dapat melacak status pengajuan (*Pending*, *Approved*, atau *Rejected*) di menu "Cek Status" menggunakan ID Booking atau NIM.

### 2. Alur Tata Usaha (Administrator)
1. **Tinjauan Dashboard**: Admin memantau seluruh permintaan yang masuk serta metrik utilisasi ruangan.
2. **Eksekusi Keputusan**:
   - **Setujui (Approve)**: Jadwal ruangan dikunci untuk peminjam terkait.
   - **Tolak (Reject)**: Admin menolak dengan menyertakan catatan/alasan penolakan (opsional).
   - **Edit**: Admin memperbaiki data peminjam secara langsung jika terdapat kesalahan penulisan.
3. **Manajemen Lanjutan**: Admin berhak menambahkan jadwal kuliah tetap, menutup/mengunci ruangan yang sedang direnovasi, serta memublikasikan pengumuman sistem.

---

## 🚀 Panduan Instalasi & Deployment

SIMAR dirancang untuk di-*deploy* secara fleksibel, baik di *Serverless Platform* (Vercel) maupun menggunakan *container* Docker (VPS/Server Mandiri).

### 📋 Prasyarat Sistem
1. **Node.js** (Versi 18.x atau 20.x ke atas) — *Jika tidak menggunakan Docker.*
2. **Database PostgreSQL** — Gunakan layanan cloud ([Neon.tech](https://neon.tech/)) atau *instance* lokal.
3. **Git** — Untuk mengkloning repositori.

### 💻 Tahap 1: Persiapan Repositori (Instalasi Lokal)
1. **Kloning repositori** dan masuk ke direktori:
   ```bash
   git clone https://github.com/Ikkaru/SIMAR.git
   cd SIMAR
   ```
2. **Instalasi *dependencies***:
   ```bash
   npm install
   ```
3. **Buat file *environment***:
   ```bash
   cp .env.example .env.local
   ```

### 🔑 Tahap 2: Konfigurasi Environment Variables
Buka `.env.local` dan atur parameter berikut:
- `DATABASE_URL`: URI koneksi langsung ke PostgreSQL Anda.
- `ADMIN_PASSWORD_HASH`: Teks *hash* bcrypt dari kata sandi admin yang Anda inginkan (gunakan *online bcrypt generator*).
- `CRON_SECRET`: Teks rahasia acak untuk melindungi *endpoint* otomatisasi.

### 🗄️ Tahap 3: Menyiapkan Database (Non-Docker)
Eksekusi perintah berikut untuk menyinkronkan skema ke database PostgreSQL Anda:
```bash
npx prisma generate
npx prisma db push
```

### 🌐 Tahap 4: Deployment
- **Lingkungan Development (Lokal)**:
  Jalankan `npm run dev` dan buka `http://localhost:3000`.
- **Vercel (Rekomendasi Utama)**:
  Impor repositori ke Vercel dan tambahkan *Environment Variables*. Eksekusi tugas mingguan (*cron job*) diatur otomatis melalui `vercel.json`.
- **Docker Compose (VPS / Self-Hosted)**:
  Jalankan `docker-compose up -d --build`. Skema database akan tersinkronisasi otomatis saat *container* hidup. *Catatan: Anda harus mengatur scheduler (seperti Linux Crontab) secara manual untuk mengeksekusi fitur Cron mingguan.*

---

## 👨‍💻 Panduan Pengembangan (Developer Guide)

Panduan teknis bagi *engineer* untuk mengelola atau memperluas fungsionalitas SIMAR:

1. **Modifikasi Skema Database**: Tambahkan model baru di `prisma/schema.prisma` $\rightarrow$ Terapkan perubahan dengan `npx prisma db push`.
2. **Penulisan Logika (Backend)**:
   - Akses data sederhana ditempatkan di `src/lib/store.ts`.
   - Mutasi data kompleks (dengan autentikasi/validasi berlapis) wajib dienkapsulasi sebagai *Server Actions* di `src/lib/actions.ts`.
3. **Pengembangan Antarmuka (UI)**: Semua komponen React dikelola di `src/components/`. Gunakan *utility classes* Tailwind CSS untuk manipulasi desain.
4. **Penambahan Halaman (Routing)**: Buat direktori baru di dalam `src/app/` dan tambahkan file `page.tsx` (mengikuti standar arsitektur Next.js App Router).
