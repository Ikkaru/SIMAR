# SIMAR — Sistem Informasi dan Booking Ruangan

> Sistem manajemen jadwal dan peminjaman ruangan yang dikembangkan untuk Program Studi Informatika, Fakultas Teknologi Informasi dan Sains Data, Universitas Sebelas Maret (UNS). Sistem ini mendigitalisasi proses perkuliahan dan peminjaman ruangan kelas/laboratorium agar terhindar dari bentrok jadwal.

---

## 📋 Detail Fitur Utama

### 👥 1. Portal Publik (Mahasiswa & Dosen)

*   **Tabel Jadwal Dinamis (Schedule Board)**
    *   Tabel interaktif yang menampilkan 11 ruangan kelas/lab.
    *   Mendukung 11 sesi perkuliahan per hari (Senin–Jumat) berdasarkan pedoman akademik resmi.
    *   **Visual Indikator Status**: 
        *   Biru: Jadwal Perkuliahan Resmi (Scheduled)
        *   Abu-abu: Slot Tersedia (Available)
        *   Kuning: Peminjaman Menunggu Persetujuan (Pending)
        *   Hijau: Peminjaman Disetujui (Approved)
        *   Merah: Ruangan / Sesi Terkunci (Locked)
    *   **Interactive Modal**: Jika pengguna mengklik slot yang sudah terisi (Jadwal Resmi/Dipinjam), sistem akan menampilkan modal informasi mendetail seperti Nama Matakuliah, Dosen Pengampu, Nama Peminjam, dan Durasi.

*   **Sistem Peminjaman (Booking System)**
    *   Formulir pengajuan peminjaman ruangan yang terintegrasi langsung di slot jadwal kosong.
    *   Mendukung peminjaman sesi panjang (meminjam lebih dari 1 sesi secara berurutan dalam sekali submit).
    *   **Atomic Booking Validation**: Mencegah *double-booking* dari tingkat *database* (melalui PostgreSQL Advisory Locks dan Prisma Transactions) sehingga aman saat diakses ratusan pengguna secara bersamaan.
    *   Wajib mengisi Nama, NIM/NIP, Dosen Pengampu/PJ, Nomor WhatsApp, dan Keperluan.

*   **Pelacakan Ketersediaan (Available Rooms Finder)**
    *   Halaman rekapitulasi cepat yang menampilkan seluruh ruangan dan sesi yang **masih kosong** dari hari Senin hingga Jumat.
    *   Data ditarik secara optimal (Bulk Fetch) dari database untuk memastikan kecepatan _load_ berada di bawah 100 milidetik, tanpa _bottleneck_.

*   **Pelacakan Status Booking (Tracker)**
    *   Pengguna dapat mengecek status persetujuan peminjamannya secara mandiri menggunakan **ID Booking** unik atau **NIM**.

*   **Pengumuman Sistem (Announcement Banner)**
    *   Pemberitahuan mengambang di atas situs yang berisi info penting, peringatan darurat, atau perubahan jadwal mendadak.

---

### 🛡️ 2. Portal Administrator (Superadmin)

*   **Admin Dashboard Terpadu**
    *   Akses dashboard dilindungi sistem autentikasi *(session-based auth)* dengan enkripsi bcrypt.
    *   Menampilkan jumlah total request peminjaman, jumlah disetujui, dan statistik penggunaan masing-masing ruangan.

*   **Sistem Sinkronisasi SIGenerate**
    *   Sinkronisasi otomatis (via Web Scraping & API) jadwal resmi dari sistem kampus (SIGenerate).
    *   Admin dapat menentukan Semester (Ganjil/Genap), Tahun Ajaran, dan menghapus jadwal resmi lama sebelum menimpa dengan data baru.

*   **Kelola Jadwal Resmi (Edit Mode / CRUD)**
    *   Fitur **"Mode Edit"** yang diproteksi di tabel admin, memisahkan secara UX antara membaca inspeksi biasa vs. mengedit data.
    *   Admin dapat menambah, mengedit, atau menghapus jadwal perkuliahan resmi secara manual untuk menangani jadwal pengganti.

*   **Inspektur & Manajemen Peminjaman (Inspector Modal)**
    *   Panel untuk menginspeksi peminjaman yang masuk. Admin dapat langsung mengklik opsi **Setujui (Approve)** atau **Tolak (Reject)**.
    *   Bisa men-edit data form mahasiswa jika terdapat kesalahan ketik, atau langsung menghapus riwayat peminjaman.

*   **Manajemen Kunci Ruangan (Room & Slot Locking)**
    *   **Slot Lock**: Mengunci sesi spesifik di satu ruangan (misalnya: Lab A, Hari Rabu, Sesi 5 diblokir).
    *   **Full Room Lock**: Mengunci seluruh sesi di sebuah ruangan pada tanggal/hari tertentu atau dikunci secara permanen (misalnya sedang ada renovasi).

*   **Sistem Pemberitahuan (Announcement System)**
    *   Admin dapat menerbitkan, mengedit, dan menghapus pengumuman *banner* di halaman publik.
    *   Pengumuman dapat diberi level (Info/Peringatan/Urgent) serta dapat diatur untuk otomatis kedaluwarsa setelah X jam atau X hari.

*   **Pembersihan Otomatis (Auto-cleanup)**
    *   Tombol "Reset Mingguan" yang dapat membersihkan riwayat *booking* sementara untuk menyiapkan minggu perkuliahan baru tanpa menghapus data esensial seperti jadwal tetap.

---

## 🛠️ Tech Stack & Infrastruktur

Sistem SIMAR dibangun secara mandiri agar mudah dideploy di mana saja, terbebas dari *vendor lock-in*.

| Lapisan | Teknologi | Penjelasan |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Menggunakan pendekatan SSR & Server Actions, diset ke `output: standalone` untuk deployment praktis via Docker. |
| **Runtime** | React 19, TypeScript 5 | Tipe data kuat untuk meminimalisasi *runtime error*. |
| **Database** | PostgreSQL | Relational Database standar industri. |
| **ORM** | Prisma (v7+) | Manajemen skema database dan akses data yang type-safe dan modular. |
| **Styling** | Tailwind CSS v4 | Penataan gaya UI yang sangat cepat dan ringan dengan custom Glassmorphism UI. |
| **Deployment** | Docker & Docker Compose | Arsitektur kontainer penuh, menyatukan App Server dan Database Server. |
| **Security** | bcrypt | Keamanan ganda: manajemen _cookie_ aman (httpOnly, strict) di sisi Node.js, dan password hashing di database. |

---

## 🚀 Panduan Deployment (Agnostic / Praktis)

SIMAR dirancang sepenuhnya portabel. Aplikasi ini dapat di-deploy dengan mudah menggunakan **Docker**, baik di VPS lokal maupun Cloud Provider (AWS, DigitalOcean, dll). Tidak perlu mengandalkan platform spesifik seperti Vercel.

### Prasyarat Minimum
- Server/Mesin dengan OS Linux/Mac/Windows
- Memiliki **Docker** dan **Docker Compose** terpasang
- Node.js versi 18+ (Hanya untuk Development lokal tanpa Docker)

### Cara Deploy via Docker (Sangat Disarankan)

Metode ini akan secara otomatis membuat dan menghubungkan kontainer **Next.js Web Server** dengan kontainer **PostgreSQL Database**.

1. **Clone Repositori**
```bash
git clone <repo-url>
cd SIMAR
```

2. **Setup Konfigurasi (.env.local)**
Buat file env berdasarkan template:
```bash
cp .env.example .env.local
```
Lalu edit file `.env.local` dan tentukan hash password admin:
> **Cara membuat Password Hash Admin:**
> Jalankan perintah berikut di terminal:
> ```bash
> node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('KATA_SANDI_ANDA', 12).then(h => console.log(h))"
> ```
> *Salin hasil output ke dalam variabel `ADMIN_PASSWORD_HASH` di `.env.local`.*

3. **Jalankan Docker Compose**
Hanya dengan satu baris perintah, aplikasi akan di-build dan siap digunakan:
```bash
docker-compose up -d --build
```

4. **Inisialisasi Database (Hanya Saat Pertama Kali Deploy)**
Setelah kontainer menyala, jalankan perintah ini untuk melakukan inisialisasi tabel-tabel Prisma di dalam kontainer:
```bash
docker exec -it simar-app npx prisma db push
```

Aplikasi sekarang dapat diakses secara publik di port **3000** server Anda (misal: `http://IP_SERVER:3000`).
*Catatan: Sangat disarankan menempatkan NGINX Reverse Proxy di depan port 3000 untuk mendapatkan koneksi HTTPS.*

---

### Cara Development Lokal Tanpa Docker

Jika Anda ingin melakukan proses _coding_ dan melihat perubahannya seketika (Hot Reload):

1. **Instal Dependensi**
```bash
npm install
```

2. **Setup Database Lokal**
Pastikan Anda memiliki server PostgreSQL yang berjalan di mesin Anda (Atau gunakan URI database eksternal/Supabase). Sesuaikan `DATABASE_URL` di file `.env.local`.
```env
DATABASE_URL="postgresql://username:password@localhost:5432/namadb?schema=public"
```

3. **Inisialisasi Struktur Database**
```bash
npx prisma db push
```
Perintah ini akan secara otomatis membuat seluruh tabel berdasarkan `prisma/schema.prisma`.

4. **Jalankan Development Server**
```bash
npm run dev
```
Akses `http://localhost:3000` di peramban Anda.

---

## 📂 Struktur Repositori Utama

```text
SIMAR/
├── prisma/
│   └── schema.prisma             # Skema Database PostgreSQL (Tabel & Relasi)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Portal Publik (Tabel Jadwal interaktif)
│   │   ├── layout.tsx            # Komponen Root (Header & Announcement Banner)
│   │   ├── admin/page.tsx        # Dashboard dan Proteksi Admin
│   │   ├── available/page.tsx    # Mesin pencari Ketersediaan Ruang (Bulk Optimized)
│   │   └── status/page.tsx       # Lacak status permohonan peminjaman
│   ├── components/
│   │   ├── AdminDashboard.tsx    # Antarmuka kendali dan inspeksi admin
│   │   ├── AnnouncementBanner.tsx# Pemberitahuan publik
│   │   ├── BookingModal.tsx      # Formulir peminjaman ruangan
│   │   └── ScheduleTable.tsx     # Komponen Render Grid Jadwal Bento
│   ├── lib/
│   │   ├── actions.ts            # Inti Logika: Seluruh Server Actions (CRUD, Sync)
│   │   ├── prisma.ts             # Inisialisasi Singleton Prisma Client
│   │   ├── auth-guard.ts         # Pengecekan sesi Admin
│   │   └── types.ts              # Global TypeScript Interfaces
│   └── middleware.ts             # Lapisan proteksi rute halaman `/admin`
├── Dockerfile                    # Skrip pembuatan container mandiri Node.js
└── docker-compose.yml            # Orkestrasi multi-container (App + PostgreSQL Database)
```
