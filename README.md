# SIMAR — Sistem Informasi dan Booking Ruangan

> Sistem manajemen jadwal dan peminjaman ruangan yang dikembangkan untuk Program Studi Informatika, Fakultas Teknologi Informasi dan Sains Data, Universitas Sebelas Maret (UNS). Sistem ini mendigitalisasi proses perkuliahan dan peminjaman ruangan kelas agar terhindar dari bentrok jadwal.

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
    *   **Interactive Modal**: Menampilkan informasi mendetail seperti Nama Matakuliah, Dosen Pengampu, Nama Peminjam, dan Durasi.

*   **Sistem Peminjaman (Booking System)**
    *   Formulir pengajuan peminjaman ruangan yang terintegrasi di slot kosong.
    *   Mendukung peminjaman sesi panjang berurutan.
    *   Wajib mengisi Nama, NIM/NIP, Dosen Pengampu/PJ, Nomor WhatsApp, dan Keperluan.

*   **Pelacakan Ketersediaan (Available Rooms Finder)**
    *   Rekapitulasi ruangan dan sesi kosong (Senin-Jumat) yang dirender sangat cepat dengan optimasi *Bulk Fetch*.

*   **Pelacakan Status Booking (Tracker)**
    *   Cek status peminjaman menggunakan **ID Booking** atau **NIM**.

*   **Pengumuman Sistem (Announcement Banner)**
    *   Pemberitahuan mengambang untuk info penting (Info/Peringatan/Urgent).

---

### 🛡️ 2. Portal Administrator (Superadmin)

*   **Admin Dashboard Terpadu**
    *   Akses dashboard dilindungi sistem autentikasi *(session-based auth)*.
    *   Menampilkan jumlah total request dan statistik penggunaan ruangan.

*   **Sistem Sinkronisasi SIGenerate**
    *   Sinkronisasi jadwal resmi dari sistem kampus.

*   **Kelola Jadwal Resmi (Edit Mode / CRUD)**
    *   Menambah, mengedit, atau menghapus jadwal perkuliahan secara manual.

*   **Inspektur & Manajemen Peminjaman**
    *   Menyetujui (Approve) atau Menolak (Reject) pengajuan peminjaman mahasiswa, atau merevisi *typo* pada form.

*   **Manajemen Kunci Ruangan (Room & Slot Locking)**
    *   **Slot Lock**: Mengunci 1 sesi spesifik.
    *   **Full Room Lock**: Mengunci ruangan penuh untuk tanggal tertentu / permanen.

*   **Pembersihan Otomatis (Auto-cleanup)**
    *   Membersihkan riwayat *booking* sementara tanpa menghapus jadwal tetap.

---

## 🛠️ Tech Stack & Infrastruktur

Sistem SIMAR dibangun secara mandiri agar mudah dideploy di mana saja, terbebas dari *vendor lock-in*.

| Lapisan | Teknologi | Penjelasan |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Menggunakan pendekatan SSR & Server Actions, diset ke `output: standalone` untuk deployment praktis via Docker. |
| **Runtime** | React 19, TypeScript 5 | Tipe data kuat untuk meminimalisasi *runtime error*. |
| **Database** | PostgreSQL | Relational Database standar industri. |
| **ORM** | Prisma | Manajemen skema database dan akses data yang type-safe dan modular. |
| **Styling** | Tailwind CSS v4 | Penataan gaya UI yang sangat cepat dan ringan dengan custom Glassmorphism UI. |
| **Deployment** | Docker & Docker Compose | Arsitektur kontainer penuh, menyatukan App Server dan Database Server. |
| **Security** | bcrypt | Manajemen _cookie_ aman di sisi Node.js, dan password hashing di database. |

---

## 🚀 Panduan Deployment (Agnostic / Praktis)

SIMAR dirancang sepenuhnya portabel. Aplikasi ini dapat di-deploy dengan mudah menggunakan **Docker**, baik di VPS lokal maupun Cloud Provider.

### Cara Deploy via Docker (Sangat Disarankan)

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
> ```bash
> node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('KATA_SANDI_ANDA', 12).then(h => console.log(h))"
> ```
> *Salin hasil output ke dalam variabel `ADMIN_PASSWORD_HASH` di `.env.local`.*

3. **Jalankan Docker Compose**
```bash
docker-compose up -d --build
```

4. **Inisialisasi Database (Hanya Saat Pertama Kali Deploy)**
```bash
docker exec -it simar-app npx prisma db push
```

Aplikasi sekarang dapat diakses secara publik di port **3000** server Anda (misal: `http://IP_SERVER:3000`).
*Catatan: Sangat disarankan menempatkan NGINX Reverse Proxy di depan port 3000 untuk mendapatkan koneksi HTTPS.*

---

## 📂 Struktur Repositori Utama

```text
SIMAR/
├── prisma/
│   └── schema.prisma             # Skema Database PostgreSQL (Tabel & Relasi)
├── src/
│   ├── app/                      # Next.js App Router Pages
│   ├── components/               # React Components
│   ├── lib/                      # Inti Logika: Server Actions (CRUD, Sync), Auth, dll.
│   └── middleware.ts             # Lapisan proteksi rute halaman `/admin`
├── Dockerfile                    # Skrip pembuatan container mandiri Node.js
└── docker-compose.yml            # Orkestrasi multi-container (App + PostgreSQL Database)
```
