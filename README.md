<div align="center">
  <h1 align="center">SIMAR</h1>
  <p align="center">
    <strong>Sistem Informasi Manajemen dan Booking Ruangan Berbasis Web</strong>
  </p>
  <p align="center">
    Platform terpadu untuk mendigitalisasi proses akademik, meminimalisasi bentrok jadwal, serta menyederhanakan administrasi operasional program studi di lingkungan perguruan tinggi.
  </p>
  
  <p align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma" alt="Prisma" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" /></a>
    <a href="https://upstash.com/"><img src="https://img.shields.io/badge/Upstash-Redis-FF2E54?style=flat-square&logo=redis" alt="Upstash" /></a>
  </p>
</div>

---

## 📖 Daftar Isi
- [Arsitektur & Teknologi](#-arsitektur--teknologi)
- [Fitur Utama](#-fitur-utama)
- [Keamanan & Proteksi](#-keamanan--proteksi)
- [Panduan Instalasi (Lokal)](#-panduan-instalasi-lokal)
- [Deployment (Production)](#-deployment-production)
- [Panduan Pengembangan (Developer Guide)](#-panduan-pengembangan-developer-guide)

---

## 🏗 Arsitektur & Teknologi

Sistem ini direkayasa menggunakan *tech stack* modern untuk menjamin latensi rendah, skalabilitas tinggi, dan keamanan di tingkat *enterprise*:

- **Core Framework**: Next.js 15 (React 19, App Router, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Database Layer**: PostgreSQL diakses secara optimal melalui Prisma ORM
- **Styling Engine**: Tailwind CSS v4 untuk antarmuka yang responsif dan modern
- **Rate Limiting & In-Memory Store**: Upstash Redis (Serverless Edge-compatible)
- **Automation**: *Web Scraping* terintegrasi (Cheerio/Puppeteer) dan Vercel Cron Jobs

---

## ✨ Fitur Utama

SIMAR membagi ekosistem aplikasinya menjadi dua portal utama yang saling terintegrasi secara *real-time*:

### 🎓 Portal Civitas Akademika (Publik)
Fokus pada transparansi dan aksesibilitas *self-service* bagi mahasiswa dan dosen:
- **Papan Jadwal Interaktif**: Visualisasi matriks jadwal ruangan dan sesi waktu yang menyesuaikan secara cerdas dengan kalender hari aktif.
- **Sistem Pengajuan Mandiri**: Mekanisme formulir peminjaman pada slot yang diverifikasi berstatus tersedia (*Available*).
- **Pemetaan Ketersediaan**: Algoritma pencarian efisien untuk memindai ruangan kosong di seluruh area kampus secara instan.
- **Pelacakan Status (*Real-Time*)**: Kemampuan memantau status pengajuan (Menunggu, Disetujui, Ditolak) berbasis ID Booking atau parameter NIM.

### 🛡 Portal Administrator
Dasbor kontrol berkeamanan tinggi untuk staf akademik dan manajemen fasilitas:
- **Statistik & Analitik**: Metrik utilisasi ruangan dan agregat status pengajuan peminjaman.
- **Alur Persetujuan Terpusat**: Manajemen siklus hidup pengajuan (Setujui, Tolak dengan catatan, modifikasi administratif).
- **Manajemen Jadwal Resmi (*Data Sync*)**: Integrasi otomatis yang mampu menyinkronkan jadwal kuliah dari sistem universitas (SIGenerate) ke database lokal.
- **Sistem Kunci Ruangan (Locking Mechanism)**: Kapabilitas untuk mengunci (*lockdown*) ruangan pada sesi spesifik atau pemblokiran ruangan secara penuh untuk keperluan pemeliharaan.
- **Pusat Informasi**: Pengelolaan pengumuman publik atau *banner* darurat secara dinamis.

---

## 🔒 Keamanan & Proteksi

Sistem ini didesain dengan pertahanan proaktif terhadap potensi serangan siber:
- **Autentikasi Terenkripsi**: Pengelolaan sesi kustom berbasis *HTTP-Only Cookies* dipadukan dengan enkripsi kata sandi `bcryptjs`.
- **Anti-Spam & Rate Limiting (Ditenagai Upstash)**: *Middleware* memblokir intrusi *bot* pada *layer Edge*. Menerapkan batas wajar (3 *request* / 30 menit) dengan **Sistem Banned** otomatis (blokir IP selama 10 jam) bagi *spammer* yang persisten.
- **Brute-Force Protection**: Melindungi *endpoint* login administrator dengan skema *cooldown* eksponensial.

---

## 🚀 Panduan Instalasi (Lokal)

Ikuti langkah-langkah berikut untuk menjalankan SIMAR di lingkungan pengembangan (Node.js versi 18+ direkomendasikan):

1. **Kloning Repositori**
   ```bash
   git clone https://github.com/Ikkaru/SIMAR.git
   cd SIMAR
   ```

2. **Instalasi Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   Gandakan file konfigurasi dan isi parameter rahasianya:
   ```bash
   cp .env.example .env.local
   ```
   **Parameter Krusial di `.env.local`:**
   - `DATABASE_URL`: URI koneksi PostgreSQL yang valid.
   - `ADMIN_PASSWORD_HASH`: Nilai hash *bcrypt* untuk menginisiasi kredensial admin pertama kali.
   - `CRON_SECRET`: Kunci enkripsi untuk validasi API tugas otomatis.
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Kredensial *Serverless Redis* (Wajib untuk fitur *Rate Limit*).

4. **Inisialisasi Database**
   Sinkronkan skema ORM ke PostgreSQL lokal Anda:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Jalankan Development Server**
   ```bash
   npm run dev
   ```

---

## 🌍 Deployment (Production)

SIMAR sangat fleksibel untuk di-*deploy* di lingkungan komputasi modern.

### Opsi A: Serverless via Vercel (Rekomendasi Utama)
Vercel adalah *environment* *first-class* untuk aplikasi Next.js.
1. Impor repositori GitHub ke dashboard Vercel.
2. Injeksi semua *environment variables* yang dibutuhkan.
3. Proses otomatisasi Vercel Cron Jobs (didefinisikan dalam `vercel.json`) akan berjalan secara *native*—mereset riwayat peminjaman setiap Sabtu (01:00 pagi).

### Opsi B: Kontainerisasi via Docker Compose (VPS Lokal / Mandiri)
Sistem dilengkapi konfigurasi *Infrastructure-as-Code* bawaan untuk lingkungan terisolasi.
1. Pastikan seluruh variabel telah didefinisikan pada `.env.local`.
2. Eksekusi kontainer:
   ```bash
   docker-compose up -d --build
   ```
> [!WARNING]
> **Penting untuk pengguna Docker:** Mesin Docker standar tidak mengeksekusi Vercel Cron Jobs. Anda **wajib** mengatur *cron scheduler* (Linux Crontab) di VPS Anda untuk menembak endpoint `http://<domain_anda>/api/cron/reset-weekly` menggunakan header rahasia (`Authorization: Bearer CRON_SECRET`) setiap minggunya.

---

## 🛠 Panduan Pengembangan (Developer Guide)

Panduan teknis bagi kolaborator dan kontributor sumber terbuka:

- **Lapisan Basis Data (`prisma/schema.prisma`)**: Seluruh modifikasi entitas wajib dilakukan melalui skema Prisma, diikuti dengan `npx prisma db push`.
- **Lapisan Logika Bisnis (`src/lib/actions.ts`)**: Aplikasi ini menggunakan pendekatan fungsi *Server Actions* Next.js yang aman untuk mutasi data (*booking, review, login*). Operasi baca (I/O murni) dienkapsulasi dalam `src/lib/store.ts`.
- **Lapisan Antarmuka (`src/components/`)**: Terdiri dari komponen React modular dan responsif. Modifikasi estetika mengikuti standar *utility classes* Tailwind CSS v4.
- **Lapisan Middleware (`src/proxy.ts`)**: Pusat intersep *traffic*. Menangani mitigasi serangan (*Rate Limit*) menggunakan API Upstash, serta mengevaluasi validitas token sesi administratif secara presisi.

<br/>
<div align="center">
  <sub>Dibangun dengan dedikasi untuk mendukung ekosistem akademik yang lebih baik.</sub>
</div>
