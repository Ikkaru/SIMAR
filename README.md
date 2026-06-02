# SIMAR — Sistem Informasi Manajemen dan Booking Ruangan

**Sistem manajemen jadwal dan peminjaman ruangan perkuliahan terpadu** yang dirancang secara khusus untuk mendigitalisasi proses akademik. SIMAR meminimalisasi bentrok jadwal, meningkatkan transparansi penggunaan fasilitas, dan mempermudah administrasi operasional program studi.

---

## 🏗️ Arsitektur & Teknologi

Sistem ini dikembangkan menggunakan *modern tech-stack* yang menjamin performa tinggi, keamanan, dan fleksibilitas *deployment*.

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) — Mengandalkan arsitektur *Server Components* dan *Server Actions* untuk performa maksimal dan keamanan akses data.
- **Language**: TypeScript 5 — Menjamin *type-safety* *end-to-end* dari database hingga komponen antarmuka.
- **Database**: PostgreSQL (Via [Neon Database](https://neon.tech/)) — Database relasional berkinerja tinggi, dioptimalkan untuk akses *serverless*.
- **ORM**: [Prisma](https://www.prisma.io/) — Lapisan akses data yang kuat untuk manajemen skema dan mitigasi injeksi SQL.
- **Styling**: Tailwind CSS v4 — Pendekatan *utility-first* dipadukan dengan desain *Glassmorphism* modern.
- **Security**: Autentikasi kustom berbasis *Database Sessions* dengan enkripsi `bcrypt`, dilengkapi middleware proteksi rute, dan mekanisme pertahanan terhadap serangan *Brute-Force*.
- **Automation**: Vercel Cron Jobs — Digunakan untuk pemeliharaan rutin database secara otomatis.

---

## 🌟 Rincian Fitur Utama

Sistem SIMAR dibagi menjadi dua antarmuka utama yang dirancang untuk kelompok pengguna yang berbeda:

### 1. Portal Publik (Mahasiswa, Dosen, Civitas Akademika)

Fokus utama dari portal publik adalah **transparansi dan kemudahan akses informasi**.

*   **Papan Jadwal Interaktif (Dynamic Schedule Board)**
    *   Tabel terintegrasi yang memetakan matriks 11 ruangan lab/kelas terhadap 11 sesi waktu standar (07:30 hingga 20:15) untuk hari Senin–Jumat.
    *   **Tab Hari Otomatis**: Secara *real-time* sistem akan membuka tab kalender sesuai dengan hari akses pengguna. Pada akhir pekan (Sabtu-Minggu), sistem otomatis menampilkan jadwal untuk minggu berjalan selanjutnya.
    *   **Indikator Status Visual**:
        *   🟦 **Biru**: Jadwal perkuliahan resmi (dari program studi).
        *   ⬜ **Abu-abu**: Ruangan kosong / tersedia untuk diajukan peminjaman.
        *   🟨 **Kuning**: Ada pengajuan peminjaman yang sedang *menunggu persetujuan* (Pending).
        *   🟩 **Hijau**: Peminjaman telah disetujui (Approved).
        *   🟥 **Merah**: Slot atau ruangan dikunci oleh administrator.
*   **Pengajuan Peminjaman Mandiri (Self-Service Booking)**
    *   Pengguna dapat mengklik slot abu-abu untuk memunculkan formulir peminjaman.
    *   Mendukung peminjaman sesi berurutan secara otomatis berdasarkan ketersediaan slot kosong berikutnya.
*   **Modul Ketersediaan Ruangan (Available Rooms Finder)**
    *   Algoritma *fast-scan* yang mengelompokkan ruangan kosong dan menyajikannya dalam antarmuka berbasis kartu (Card UI) untuk mempercepat pencarian ruang ganti/tambahan.
*   **Pelacak Status Peminjaman (Live Tracker)**
    *   Sistem pencarian untuk melacak status persetujuan pengajuan (*Approved*, *Rejected*, *Pending*) menggunakan **ID Peminjaman** atau **NIM**.

### 2. Portal Administrator (Superadmin)

Pusat kendali komprehensif bagi staf tata usaha atau admin program studi. Akses dilindungi secara ketat.

*   **Autentikasi & Keamanan (Admin Auth Guard)**
    *   Login diamankan menggunakan manajemen sesi tersimpan di database (bukan JWT token stateless), sehingga akses dapat dicabut kapan saja.
    *   **Proteksi Brute-Force**: Dilengkapi dengan algoritma *Progressive Cooldown* (Blokir 1 menit → 2 menit → 5 menit → 15 menit) berdasarkan alamat IP jika terjadi percobaan login gagal berulang kali.
    *   *Self-service* perubahan password admin dari dalam dashboard secara aman.
*   **Dashboard Statistik**
    *   Menampilkan metrik agregasi: total pengajuan masuk, permintaan *pending*, dan pemetaan persentase kepadatan (utilisasi) penggunaan masing-masing ruangan.
*   **Inspeksi & Eksekusi Peminjaman (Approval Workflow)**
    *   Daftar seluruh permintaan peminjaman yang masuk. Admin dapat memeriksa detail keperluan, melakukan persetujuan (Approve), penolakan dengan catatan (Reject), hingga mengedit langsung data peminjaman jika ada salah ketik (typo) dari mahasiswa.
*   **Manajemen Jadwal Resmi (CRUD Operations)**
    *   Admin dapat menambahkan jadwal mata kuliah tetap secara manual.
    *   *(Fitur Tambahan Terintegrasi)*: Modul sinkronisasi otomatis untuk menarik jadwal massal dari sistem informasi internal kampus (SIGenerate).
*   **Sistem Kunci Protektif (Locking System)**
    *   **Slot Lock**: Mengunci spesifik satu hari, satu ruang, pada satu sesi (contoh: Ruang kelas dipakai ujian dadakan).
    *   **Full Room Lock**: Menutup peminjaman untuk satu ruangan penuh sepanjang hari tersebut (contoh: Ruangan sedang direnovasi atau AC rusak).
*   **Manajemen Pengumuman (Announcement System)**
    *   Membuat *banner* pengumuman dinamis yang muncul secara global di portal publik.
*   **Auto-Cleanup & Reset (Otomatisasi)**
    *   Sistem terhubung dengan **Vercel Cron Jobs** yang dieksekusi setiap **Sabtu Pukul 01:00 WIB**. Cron ini secara otomatis menghapus riwayat peminjaman mingguan, mereset tabel jadwal menjadi bersih kembali hanya berisi jadwal perkuliahan resmi untuk menyambut awal minggu perkuliahan baru.

---

## ⚙️ Panduan Operasional & Deployment

SIMAR didesain sebagai aplikasi *Agnostic*, artinya tidak terkunci pada satu vendor cloud. Sistem ini dapat dieksekusi langsung di lingkungan *Serverless* (Vercel) maupun di-container-kan menggunakan Docker.

### Prasyarat Infrastruktur
1. Node.js versi 18+ atau 20+ (Untuk lingkungan Non-Docker).
2. Database PostgreSQL (Disarankan menggunakan [Neon.tech](https://neon.tech) untuk *connection-pooling* yang optimal).

### Instalasi Repositori
```bash
git clone https://github.com/Ikkaru/SIMAR.git
cd SIMAR
npm install
```

### Konfigurasi Environment Variables
Gandakan file template dan atur kredensial Anda:
```bash
cp .env.example .env.local
```
Sesuaikan parameter krusial di `.env.local`:
- `DATABASE_URL`: URI koneksi PostgreSQL Anda.
- `ADMIN_PASSWORD_HASH`: Nilai *hash* awal untuk akun administrator pertama. (Gunakan *script* bcrypt untuk meng-generate hash ini).
- `CRON_SECRET`: Kata sandi rahasia untuk memproteksi *endpoint* otomatisasi.

### Sinkronisasi Skema Database (Untuk Non-Docker)
Jika Anda **tidak** menggunakan Docker, Anda wajib melakukan sinkronisasi struktur tabel ke database secara manual sebelum menjalankan server:
```bash
npx prisma generate
npx prisma db push
```
*(Catatan: Jika Anda melakukan deployment menggunakan **Docker Compose**, Anda **tidak perlu** menjalankan perintah di atas karena sinkronisasi database akan diurus otomatis pada saat container berjalan).*

---

### Opsi Deployment 1: Vercel (Direkomendasikan)
Vercel adalah platform ideal untuk Next.js dan merupakan cara terbaik untuk menjalankan fitur Cron bawaan proyek ini.
1. Impor repositori GitHub ke *Dashboard* Vercel.
2. Tambahkan seluruh *Environment Variables* di atas melalui menu pengaturan Vercel.
3. Deploy!
4. **Vercel Cron** (`vercel.json`) akan otomatis terbaca oleh sistem Vercel. Pastikan `CRON_SECRET` di *Environment Variables* sudah diisi agar Vercel dapat mengeksekusi *cleanup* mingguan setiap hari Sabtu.

### Opsi Deployment 2: Docker Compose (VPS Lokal / Mandiri)
Sistem ini dilengkapi dengan `Dockerfile` dan `docker-compose.yml` untuk lingkungan mandiri. 
Kerennya, Dockerfile sudah diatur sedemikian rupa agar **otomatis menjalankan skrip sinkronisasi database (`npx prisma db push`) setiap kali kontainer dinyalakan**, sehingga *zero-setup*!
```bash
docker-compose up -d --build
```
> **Catatan Penting untuk Docker Deployment**: Fitur *Vercel Cron* otomatis tidak akan bekerja pada mesin Docker. Anda harus mengatur *scheduler* eksternal secara manual (misalnya *cron* di Linux) untuk memanggil *endpoint* API cleanup dengan *header* autorisasi:
> ```bash
> # Contoh Cron Job Linux (Jalankan tiap Sabtu jam 01:00)
> 0 1 * * 6 curl -X GET -H "Authorization: Bearer <CRON_SECRET_ANDA>" https://domainanda.com/api/cron/reset-weekly
> ```

---

## 📂 Struktur Repositori Inti

Sistem ini mengikuti standar struktur direktori **Next.js App Router** terbaru, dipadukan dengan pemisahan *concern* untuk kemudahan *maintenance*.

```text
SIMAR/
├── prisma/
│   ├── schema.prisma             # Jantung Database: Skema tabel & relasi PostgreSQL.
│   └── migrations/               # Riwayat perubahan skema database.
├── public/                       # Aset statis seperti logo, favicon, dan gambar public.
├── src/
│   ├── app/                      # NEXT.JS APP ROUTER (Sistem Routing)
│   │   ├── admin/page.tsx        # /admin      -> Halaman dashboard utama administrator.
│   │   ├── available/page.tsx    # /available  -> Halaman pencarian ruangan kosong.
│   │   ├── status/page.tsx       # /status     -> Halaman pelacakan status booking.
│   │   ├── api/cron/             # /api/cron/* -> Endpoint otomatisasi rahasia (contoh: Vercel Cron).
│   │   ├── layout.tsx            # Root Layout (Navigasi global, metadata, struktur HTML).
│   │   └── page.tsx              # /           -> Halaman Beranda (Tabel Jadwal Publik).
│   │
│   ├── components/               # REUSABLE UI COMPONENTS (React)
│   │   ├── AdminDashboard.tsx    # Komponen kompleks: Dashboard interaktif untuk admin.
│   │   ├── AdminLogin.tsx        # UI Login Admin.
│   │   ├── BookingModal.tsx      # Modal form peminjaman mahasiswa.
│   │   ├── DaySelector.tsx       # Komponen navigasi hari (Senin-Jumat).
│   │   └── ScheduleTable.tsx     # Komponen inti render tabel matriks jadwal.
│   │
│   └── lib/                      # BUSINESS LOGIC & UTILITIES (Backend-in-Frontend)
│       ├── actions.ts            # Server Actions utama (Auth, Cron, Manipulasi Mutasi Data kompleks).
│       ├── store.ts              # Lapisan akses data mentah ke database menggunakan Prisma.
│       ├── types.ts              # Kumpulan antarmuka tipe (TypeScript Interfaces) secara global.
│       ├── auth-guard.ts         # Middleware proteksi session login untuk halaman Admin.
│       └── prisma.ts             # Inisialisasi koneksi Prisma Client Singleton.
│
├── vercel.json                   # Konfigurasi spesifik Vercel (Cron jobs, header, dll).
├── .env.example                  # Template variabel lingkungan wajib.
├── middleware.ts                 # Interceptor route Next.js (Proteksi `/admin` route).
├── Dockerfile                    # Blueprint untuk merakit kontainer Node.js.
└── docker-compose.yml            # Konfigurasi orkestrasi aplikasi & database lokal.
```

---

## 👨‍💻 Panduan Keberlanjutan Proyek (Developer Guide)

Panduan teknis ini ditujukan bagi insinyur perangkat lunak yang akan mengambil alih, mengelola, atau menambah fitur baru pada SIMAR di masa depan.

### 1. Menambahkan Tabel / Model Baru di Database
Sistem ini sangat bergantung pada **Prisma ORM**. Jika Anda ingin menambahkan fitur baru yang memerlukan penyimpanan data:
- Buka file `prisma/schema.prisma`.
- Tambahkan `model` baru (contoh: `model RuanganBaru { ... }`).
- Jalankan perintah `npx prisma db push` (jika menggunakan Neon/Development) atau `npx prisma migrate dev` (jika menggunakan environment yang sangat *strict*).
- Regenerasi klien Prisma: `npx prisma generate` (agar VS Code langsung mengenali tipe data yang baru).

### 2. Memodifikasi atau Menambahkan Logika Backend Baru (CRUD)
Semua alur pengolahan data menggunakan **Next.js Server Actions**.
- **Untuk akses data sederhana**: Tulis query Prisma di dalam `src/lib/store.ts`.
- **Untuk logika kompleks (yang butuh autentikasi atau validasi berlapis)**: Buat fungsi berlabel `'use server'` di dalam `src/lib/actions.ts`.
- **Aturan Emas**: Jangan pernah memanggil Prisma Client langsung dari komponen UI klien (file berlabel `'use client'`). Selalu panggil fungsi dari `actions.ts`.

### 3. Mengubah Tampilan Antarmuka (UI/UX)
- Semua komponen UI berada di `src/components/`. 
- Sistem styling secara eksklusif menggunakan **Tailwind CSS**. 
- Jika komponen mulai membesar dan menyentuh ribuan baris (misalnya `AdminDashboard.tsx`), pertimbangkan untuk memecah fungsionalitasnya ke komponen-komponen kecil (*Component Extraction*).

### 4. Menambah Halaman Baru (Routing)
- Untuk menambahkan URL baru (misalnya `domain.com/panduan`), Anda cukup membuat folder baru di `src/app/panduan/` dan letakkan file `page.tsx` di dalamnya.

---
*Dikembangkan dengan penuh dedikasi untuk efisiensi digitalisasi administrasi.*
