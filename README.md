# SIMAR — Sistem Informasi Manajemen dan Booking Ruangan

SIMAR adalah sistem manajemen jadwal dan peminjaman ruangan perkuliahan terpadu yang dirancang untuk mendigitalisasi proses akademik, meminimalisasi bentrok jadwal, serta mempermudah administrasi operasional program studi.

## Arsitektur & Teknologi

Sistem ini dibangun menggunakan arsitektur modern untuk menjamin performa dan fleksibilitas *deployment*:

- **Framework**: Next.js 15 (App Router)
- **Bahasa Pemrograman**: TypeScript 5
- **Database**: PostgreSQL (direkomendasikan via Neon Database)
- **ORM**: Prisma
- **UI/UX**: Tailwind CSS v4
- **Keamanan**: Autentikasi sesi kustom, enkripsi `bcrypt`, dan proteksi *Brute-Force*
- **Otomatisasi**: Vercel Cron Jobs untuk pemeliharaan rutin mingguan

## Fungsionalitas Utama

### 1. Portal Publik (Mahasiswa & Civitas Akademika)
Fokus pada transparansi dan kemudahan akses informasi ketersediaan ruangan:
- **Papan Jadwal Interaktif**: Matriks jadwal ruangan dan sesi waktu standar yang menyesuaikan otomatis dengan hari aktif.
- **Pengajuan Peminjaman**: Formulir peminjaman mandiri pada slot yang berstatus tersedia.
- **Ketersediaan Ruangan**: Algoritma pencarian cepat untuk memetakan ruangan kosong di seluruh kampus.
- **Pelacakan Status**: Pemantauan status persetujuan peminjaman secara *real-time* berbasis ID Booking atau NIM.

### 2. Portal Administrator
Pusat kendali komprehensif dengan sistem keamanan ketat bagi staf administrasi:
- **Dashboard Statistik**: Metrik utilisasi ruangan dan status pengajuan secara agregat.
- **Manajemen Peminjaman**: Alur kerja persetujuan (Setujui, Tolak dengan catatan, atau Edit data).
- **Manajemen Jadwal Resmi**: *CRUD operations* jadwal tetap dan integrasi sinkronisasi otomatis ke sistem informasi kampus (SIGenerate).
- **Sistem Kunci (Locking System)**: Penutupan peminjaman untuk sesi spesifik maupun penguncian ruangan secara penuh.
- **Manajemen Pengumuman**: Sistem pengelolaan spanduk informasi global.
- **Otomatisasi Sistem**: *Cleanup* otomatis untuk mereset riwayat peminjaman setiap akhir pekan.

## Panduan Instalasi & Deployment

SIMAR mendukung eksekusi di lingkungan *Serverless* (Vercel) maupun lingkungan terisolasi berbasis Docker.

### Prasyarat
- Node.js versi 18+ (Untuk lingkungan Non-Docker)
- PostgreSQL

### Instalasi Lokal
```bash
git clone https://github.com/Ikkaru/SIMAR.git
cd SIMAR
npm install
cp .env.example .env.local
```
Sesuaikan parameter krusial di `.env.local`:
- `DATABASE_URL`: URI koneksi PostgreSQL.
- `ADMIN_PASSWORD_HASH`: Hash bcrypt untuk kata sandi administrator awal.
- `CRON_SECRET`: Kunci otorisasi untuk eksekusi API *cron job*.

### Sinkronisasi Skema Database (Non-Docker)
```bash
npx prisma generate
npx prisma db push
```

### Opsi Deployment
- **Vercel (Direkomendasikan)**: Impor repositori ke Vercel dan atur variabel *environment*. Eksekusi tugas berkala (*cron job*) mingguan diatur secara otomatis melalui `vercel.json`.
- **Docker Compose**: Jalankan `docker-compose up -d --build`. Skrip sinkronisasi database dijalankan otomatis saat kontainer dihidupkan. Fitur *cron job* perlu dipanggil menggunakan eksekutor terpisah seperti *Linux cron* dengan header otorisasi yang sesuai.

## Panduan Pengembangan (Developer Guide)

Panduan teknis bagi insinyur perangkat lunak untuk mengelola atau menambah fitur:
- **Perubahan Database**: Model dikelola dalam `prisma/schema.prisma`. Gunakan `npx prisma db push` untuk merefleksikan perubahan.
- **Logika Backend**: Akses database sederhana dilakukan melalui `src/lib/store.ts`. Operasi mutasi data yang kompleks wajib ditempatkan dalam *Server Actions* (`src/lib/actions.ts`).
- **Antarmuka (UI)**: Komponen React tersentralisasi di `src/components/`. 
- **Routing**: Semua konfigurasi halaman berbasis Next.js App Router yang terletak pada `src/app/`.
