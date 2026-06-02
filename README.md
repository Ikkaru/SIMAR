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

## 🚀 Panduan Instalasi & Deployment

SIMAR dirancang untuk mudah di-*deploy* di berbagai lingkungan, baik menggunakan *Serverless Platform* (seperti Vercel) maupun menggunakan container Docker (untuk VPS atau server mandiri).

### 📋 Prasyarat Sistem
Sebelum memulai instalasi, pastikan sistem Anda telah memiliki:
1. **Node.js** (Versi 18.x atau 20.x ke atas) — *Jika tidak menggunakan Docker.*
2. **Git** — Untuk melakukan kloning repositori.
3. **Database PostgreSQL** — Direkomendasikan menggunakan layanan cloud seperti [Neon.tech](https://neon.tech/) atau Supabase, atau bisa juga menggunakan instance lokal.
4. **Docker & Docker Compose** (Opsional) — *Hanya jika Anda ingin menggunakan opsi deployment Docker.*

---

### 💻 Tahap 1: Persiapan Repositori (Instalasi Lokal)

1. **Kloning repositori** ke dalam komputer/server Anda:
   ```bash
   git clone https://github.com/Ikkaru/SIMAR.git
   cd SIMAR
   ```

2. **Instalasi *dependencies*** menggunakan npm:
   ```bash
   npm install
   ```

3. **Buat file konfigurasi *environment*** dengan menyalin dari file *template*:
   ```bash
   cp .env.example .env.local
   ```
   *(Catatan: Jika Anda menggunakan Windows CMD/PowerShell, Anda bisa membuat file `.env.local` secara manual dan salin isi dari `.env.example` ke dalamnya).*

---

### 🔑 Tahap 2: Konfigurasi Environment Variables

Buka file `.env.local` yang baru saja dibuat, lalu sesuaikan parameter wajib berikut:

- `DATABASE_URL`
  URL koneksi langsung ke database PostgreSQL Anda. Pastikan formatnya sudah benar.
  *Contoh: `postgresql://user:password@localhost:5432/simar_db?schema=public`*

- `ADMIN_PASSWORD_HASH`
  Karena alasan keamanan, kata sandi *default* administrator tidak disimpan dalam teks biasa. Anda harus melakukan *hashing* menggunakan `bcrypt`. Gunakan *online bcrypt generator* untuk mengubah kata sandi yang Anda inginkan (misal: "admin123") menjadi teks hash, lalu tempelkan (*paste*) nilai tersebut ke variabel ini.

- `CRON_SECRET`
  Kunci rahasia sembarang (berupa teks alfanumerik acak panjang) yang akan digunakan untuk mengamankan *endpoint* eksekusi pembersihan jadwal otomatis mingguan.

---

### 🗄️ Tahap 3: Menyiapkan Database

Jika Anda **tidak menggunakan Docker**, Anda wajib menyinkronkan struktur database ke PostgreSQL sebelum menyalakan server:

1. **Generate Prisma Client** agar tipe data TypeScript terbuat sesuai skema:
   ```bash
   npx prisma generate
   ```

2. **Push skema tabel ke dalam database**:
   ```bash
   npx prisma db push
   ```
   *Perhatian: Perintah ini akan membuat semua tabel yang dibutuhkan secara otomatis pada database kosong Anda.*

---

### 🌐 Tahap 4: Menjalankan Server

Setelah semua tahap persiapan di atas selesai, Anda siap menjalankan aplikasi!

#### A. Menjalankan di Lingkungan Development (Lokal)
```bash
npm run dev
```
Aplikasi sekarang dapat diakses melalui `http://localhost:3000`.

#### B. Deployment ke Vercel (Rekomendasi Utama)
Vercel adalah *platform* yang paling ideal karena akan secara otomatis membaca dan menjalankan Vercel Cron Jobs (`vercel.json`) tanpa perlu penyetelan tambahan.
1. Masuk ke *Dashboard* Vercel dan buat *Project* baru dari repositori GitHub Anda.
2. Pada bagian *Environment Variables*, masukkan ketiga kunci wajib di atas (`DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `CRON_SECRET`).
3. Tekan **Deploy** dan Vercel akan mengurus sisanya.

#### C. Deployment menggunakan Docker Compose (VPS / Self-Hosted)
Pilihan tepat jika Anda ingin menjalankan aplikasi di server Linux/VPS mandiri secara terisolasi. Kelebihannya, skrip sinkronisasi database dijalankan otomatis saat kontainer dihidupkan (*zero-setup*).
```bash
docker-compose up -d --build
```
> **Penting untuk Docker Deployment**: 
> Fitur *Vercel Cron* tidak akan bekerja di luar ekosistem Vercel. Anda harus mengatur eksekutor jadwal tambahan (contohnya *Crontab* di Linux) agar berjalan tiap hari Sabtu pukul 01:00 pagi. Berikut adalah contoh sintaks crontab:
> ```bash
> 0 1 * * 6 curl -X GET -H "Authorization: Bearer <ISI_DENGAN_CRON_SECRET_ANDA>" https://domain-simar-anda.com/api/cron/reset-weekly
> ```

## Panduan Pengembangan (Developer Guide)

Panduan teknis bagi insinyur perangkat lunak untuk mengelola atau menambah fitur:
- **Perubahan Database**: Model dikelola dalam `prisma/schema.prisma`. Gunakan `npx prisma db push` untuk merefleksikan perubahan.
- **Logika Backend**: Akses database sederhana dilakukan melalui `src/lib/store.ts`. Operasi mutasi data yang kompleks wajib ditempatkan dalam *Server Actions* (`src/lib/actions.ts`).
- **Antarmuka (UI)**: Komponen React tersentralisasi di `src/components/`. 
- **Routing**: Semua konfigurasi halaman berbasis Next.js App Router yang terletak pada `src/app/`.
