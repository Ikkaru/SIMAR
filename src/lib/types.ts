// ============================================================
// SIMAR - Sistem Informasi dan Booking Ruangan
// Core Type Definitions
// ============================================================

/** Hari-hari aktif perkuliahan */
export type Day = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';

/** Nomor sesi perkuliahan (1–11) */
export type SessionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Waktu sesi: jam mulai dan jam akhir */
export interface SessionTime {
  sesi: SessionNumber;
  jamMulai: string;
  jamAkhir: string;
}

/** Daftar ruangan yang tersedia */
export const ROOM_LIST = [
  'B4-11',
  'B4-12',
  'Lab 3 TIK Lt.3',
  'Lab 4 TIK Lt.4',
  'Lab B4.04',
  'B4.06',
  'Lab B4.05',
  'B4-10',
  'Pasca 1301',
  'Pasca 1312',
  'Pasca 1304',
] as const;

export type RoomName = (typeof ROOM_LIST)[number];

/** Informasi detail sebuah ruangan */
export interface Room {
  id: string;
  name: RoomName;
  type: 'kelas' | 'lab' | 'pasca';
  building: string;
}

/** Status slot pada jadwal */
export type SlotStatus =
  | 'scheduled'    // Terisi dari jadwal resmi (spreadsheet)
  | 'borrowed'     // Dipinjam oleh prodi/program studi lain
  | 'available'    // Tersedia untuk booking
  | 'pending'      // Ada booking menunggu persetujuan
  | 'approved'     // Booking telah disetujui (Dipinjam)
  | 'locked';      // Dikunci manual oleh admin

/** Sebuah slot dalam jadwal mingguan */
export interface ScheduleSlot {
  day: Day;
  session: SessionNumber;
  room: RoomName;
  courseName: string;      // Nama mata kuliah (kosong = tersedia)
  status: SlotStatus;
}

/** Status booking */
export type BookingStatus = 'pending' | 'approved' | 'rejected';

/** Data booking yang dikirim pengguna */
export interface BookingRequest {
  id: string;
  day: Day;
  session: SessionNumber;
  room: RoomName;
  namaPJ: string;              // Nama Penanggung Jawab
  nim: string;                 // NIM Penanggung Jawab
  durasiPemakaian: number;     // Durasi dalam jam
  namaMatakuliah: string;      // Nama Mata Kuliah
  dosenPengampu: string;       // Nama Dosen Pengampu
  status: BookingStatus;
  createdAt: string | Date;           // ISO date string or Date obj
  reviewedAt?: string | Date | null;  // ISO date string or Date obj
  reviewNote?: string | null;         // Catatan dari admin
}

/** Form data untuk submit booking baru */
export interface BookingFormData {
  day: Day;
  session: SessionNumber;
  room: RoomName;
  namaPJ: string;
  nim: string;
  durasiPemakaian: number;
  namaMatakuliah: string;
  dosenPengampu: string;
}

/** Jadwal sesi untuk Senin–Kamis */
export const SESSION_TIMES_WEEKDAY: SessionTime[] = [
  { sesi: 1, jamMulai: '07:30', jamAkhir: '08:20' },
  { sesi: 2, jamMulai: '08:25', jamAkhir: '09:15' },
  { sesi: 3, jamMulai: '09:20', jamAkhir: '10:10' },
  { sesi: 4, jamMulai: '10:15', jamAkhir: '11:05' },
  { sesi: 5, jamMulai: '11:10', jamAkhir: '12:00' },
  { sesi: 6, jamMulai: '13:00', jamAkhir: '13:50' },
  { sesi: 7, jamMulai: '13:55', jamAkhir: '14:45' },
  { sesi: 8, jamMulai: '15:30', jamAkhir: '16:20' },
  { sesi: 9, jamMulai: '16:25', jamAkhir: '17:15' },
  { sesi: 10, jamMulai: '18:00', jamAkhir: '18:50' },
  { sesi: 11, jamMulai: '18:55', jamAkhir: '19:20' },
];

/** Jadwal sesi untuk Jumat */
export const SESSION_TIMES_FRIDAY: SessionTime[] = [
  { sesi: 1, jamMulai: '07:30', jamAkhir: '08:20' },
  { sesi: 2, jamMulai: '08:25', jamAkhir: '09:15' },
  { sesi: 3, jamMulai: '09:20', jamAkhir: '10:10' },
  { sesi: 4, jamMulai: '10:15', jamAkhir: '11:05' },
  { sesi: 5, jamMulai: '13:30', jamAkhir: '14:20' },
  { sesi: 6, jamMulai: '14:25', jamAkhir: '15:15' },
  { sesi: 7, jamMulai: '15:30', jamAkhir: '16:20' },
  { sesi: 8, jamMulai: '16:25', jamAkhir: '17:15' },
  { sesi: 9, jamMulai: '18:00', jamAkhir: '18:50' },
  { sesi: 10, jamMulai: '18:55', jamAkhir: '19:20' },
  { sesi: 11, jamMulai: '19:25', jamAkhir: '20:15' },
];

/** Helper: Mendapatkan jadwal sesi berdasarkan hari */
export function getSessionTimes(day: Day): SessionTime[] {
  return day === 'Jumat' ? SESSION_TIMES_FRIDAY : SESSION_TIMES_WEEKDAY;
}

/** Semua hari aktif */
export const DAYS: Day[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/** Helper: Mendapatkan tanggal untuk minggu yang sedang berjalan */
export function getWeekDates(): Record<Day, { dateObj: Date; formatted: string }> {
  const now = new Date();
  
  // Jika hari Sabtu (6) atau Minggu (0), kita geser ke minggu berikutnya agar jadwal menampilkan minggu depan
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    const daysToAdd = dayOfWeek === 6 ? 2 : 1;
    now.setDate(now.getDate() + daysToAdd);
  }

  // Cari tanggal hari Senin pada minggu tersebut
  // getDay() mengembalikan 1 untuk Senin, 2 untuk Selasa, dst.
  const currentDayOfWeek = now.getDay(); 
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() + diffToMonday);

  const result: any = {};
  
  DAYS.forEach((day, index) => {
    const dateForDay = new Date(mondayDate);
    dateForDay.setDate(mondayDate.getDate() + index);
    
    const dayNum = dateForDay.getDate();
    const monthStr = INDONESIAN_MONTHS[dateForDay.getMonth()];
    
    result[day] = {
      dateObj: dateForDay,
      formatted: `${dayNum} ${monthStr}`
    };
  });

  return result;
}

/** Helper: Cek apakah hari ini sudah lewat (untuk disable booking) */
export function isDayPast(dayName: Day): boolean {
  const dates = getWeekDates();
  const targetDateObj = new Date(dates[dayName].dateObj); // Clone to avoid mutation
  
  // Set target date ke akhir hari tersebut agar bisa di-booking sampai jam 23:59 hari itu
  targetDateObj.setHours(23, 59, 59, 999);
  
  const now = new Date();
  return now.getTime() > targetDateObj.getTime();
}

