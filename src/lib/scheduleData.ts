// ============================================================
// SIMAR - Data Jadwal Resmi dari Spreadsheet Prodi Informatika
// Semester Ganjil 2025/2026 - Universitas Sebelas Maret
// ============================================================

import { Day, SessionNumber, RoomName, ROOM_LIST, ScheduleSlot } from './types';

/**
 * Matriks jadwal mentah: Hari -> Sesi -> array of string (urut sesuai ROOM_LIST)
 * String kosong = slot tersedia
 */
type RawScheduleMatrix = Record<Day, Record<number, string[]>>;

const RAW_SCHEDULE: RawScheduleMatrix = {
  Senin: {
    1: [
      'Pemrograman Web (4) (B)', '', '', 'Matematika Diskrit I (2) (B)',
      'Digunakan S-1 Sains Data', 'Aljabar Linier (2) (D)', 'Jaringan Komputer (4) (C)',
      'Matematika Diskrit I (2) (C)', 'Proyek Perangkat Lunak (6) (A)',
      'Dipinjam Aljabar Linear', 'Metode Penelitian (6) (B)',
    ],
    2: [
      'Pemrograman Web (4) (B)', '', '', 'Matematika Diskrit I (2) (B)',
      '', 'Aljabar Linier (2) (D)', 'Jaringan Komputer (4) (C)',
      'Matematika Diskrit I (2) (C)', 'Proyek Perangkat Lunak (6) (A)',
      'Dipinjam Aljabar Linear', 'Metode Penelitian (6) (B)',
    ],
    3: [
      'Kecerdasan Buatan (4) (D)', '', 'Pengembangan Aplikasi (4) (B)',
      'Matematika Diskrit I (2) (B)', 'Digunakan S-1 Sains Data',
      'Aljabar Linier (2) (D)', '', 'Matematika Diskrit I (2) (C)',
      'Proyek Perangkat Lunak (6) (A)', 'Digunakan S-1 Sains Data',
      'Metode Penelitian (6) (B)',
    ],
    4: [
      'Kecerdasan Buatan (4) (D)', '', 'Pengembangan Aplikasi (4) (B)',
      'Pengembangan Aplikasi (4) (C)', 'Pendidikan Kewarganegaraan (2) (D)',
      'Digunakan S-1 Sains Data', '', 'Organisasi Sistem Komputer (2) (A)',
      'Digunakan S-1 Sains Data', 'Digunakan S-1 Sains Data',
      'Dipinjam Jarkom (A dan B)',
    ],
    5: [
      'Kecerdasan Buatan (4) (D)', '', '',
      'Pengembangan Aplikasi (4) (C)', 'Pendidikan Kewarganegaraan (2) (D)',
      'Digunakan S-1 Sains Data', 'Digunakan S-1 Sains Data',
      'Organisasi Sistem Komputer (2) (A)', 'Digunakan S-1 Sains Data',
      'Digunakan S-1 Sains Data', 'Dipinjam Jarkom (A dan B)',
    ],
    6: [
      'Kalkulus II (2) (A)', '', 'Organisasi Sistem Komputer (2) (B)',
      '', 'Jaringan Komputer (4) (A) P', 'Digunakan S-1 Sains Data',
      'Organisasi Sistem Komputer (2) (D) P', 'Rekayasa Perangkat Lunak (4) (D)',
      'Digunakan S-1 Sains Data', 'Business Intelligence (6) (A)',
      'Dipinjam Jarkom (A dan B)',
    ],
    7: [
      'Kalkulus II (2) (A)', '', 'Organisasi Sistem Komputer (2) (B)',
      '', 'Jaringan Komputer (4) (A) P', '', '',
      'Rekayasa Perangkat Lunak (4) (D)', '',
      'Business Intelligence (6) (A)', 'Dipinjam Jarkom (A dan B)',
    ],
    8: [
      'Kalkulus II (2) (A)', '', 'Organisasi Sistem Komputer (2) (B) P',
      'Rekayasa Perangkat Lunak (4) (A) P', '', '', '',
      'Rekayasa Perangkat Lunak (4) (D)', '',
      'Business Intelligence (6) (A)', '',
    ],
    9: [
      'Bahasa Inggris I (1) (A)', '', '', '', '', '', '', '', '', '', '',
    ],
    10: [
      'Bahasa Inggris I (1) (A)', '', '', '', '', '', '', '', '', '', '',
    ],
    11: ['', '', '', '', '', '', '', '', '', '', ''],
  },

  Selasa: {
    1: [
      'Pemrograman Web (4) (C)', '', 'Matematika Diskrit I (2) (A)',
      '', 'Jaringan Komputer (4) (A)', 'Metode Penelitian (6) (A)',
      'Jaringan Komputer (4) (D)', 'Aljabar Linier (2) (C)',
      'Proyek Perangkat Lunak (6) (B)', 'Digunakan S-1 Sains Data',
      'Matematika Diskrit I (2) (D)',
    ],
    2: [
      'Pemrograman Web (4) (C)', '', 'Matematika Diskrit I (2) (A)',
      '', 'Jaringan Komputer (4) (A)', 'Metode Penelitian (6) (A)',
      'Jaringan Komputer (4) (D)', 'Aljabar Linier (2) (C)',
      'Proyek Perangkat Lunak (6) (B)', 'Digunakan S-1 Sains Data',
      'Matematika Diskrit I (2) (D)',
    ],
    3: [
      '', '', 'Matematika Diskrit I (2) (A)',
      '', 'Digunakan S-1 Sains Data', 'Metode Penelitian (6) (A)',
      'Jaringan Komputer (4) (D) P', 'Aljabar Linier (2) (C)',
      'Proyek Perangkat Lunak (6) (B)', '',
      'Matematika Diskrit I (2) (D)',
    ],
    4: [
      'Struktur Data & Algoritma (2) (D) P', '', '',
      '', '', 'Digunakan S-1 Sains Data',
      'Jaringan Komputer (4) (D) P', 'Pendidikan Kewarganegaraan (2) (B)',
      '', 'Pendidikan Kewarganegaraan (2) (C)',
      'Organisasi Sistem Komputer (2) (A) P',
    ],
    5: [
      '', '', '', '', 'Pemrograman Web (4) (D) P',
      'Digunakan S-1 Sains Data', '', 'Pendidikan Kewarganegaraan (2) (B)',
      '', 'Pendidikan Kewarganegaraan (2) (C)', '',
    ],
    6: [
      'Aljabar Linier (2) (A)', '', '',
      'Cyber Security (6) (A)', '', 'Rekayasa Perangkat Lunak (4) (D) P',
      'Manajemen Sistem Informasi (2) (C)', 'Kalkulus II (2) (B)',
      '', 'Kalkulus II (2) (D)', 'Teori Bahasa & Automata (4) (A)',
    ],
    7: [
      'Aljabar Linier (2) (A)', '', '',
      'Cyber Security (6) (A)', 'Digunakan S-1 Sains Data', '',
      'Manajemen Sistem Informasi (2) (C)', 'Kalkulus II (2) (B)',
      '', 'Kalkulus II (2) (D)', 'Teori Bahasa & Automata (4) (A)',
    ],
    8: [
      'Aljabar Linier (2) (A)', '', '',
      'Cyber Security (6) (A)', '', '', '',
      'Kalkulus II (2) (B)', '', 'Kalkulus II (2) (D)',
      'Teori Bahasa & Automata (4) (A)',
    ],
    9: ['', '', '', '', '', '', '', '', '', '', ''],
    10: ['', '', '', '', '', '', '', '', '', '', ''],
    11: ['', '', '', '', '', '', '', '', '', '', ''],
  },

  Rabu: {
    1: [
      'Kecerdasan Buatan (4) (B)', '', 'Expert System (6) (A)',
      'Organisasi Sistem Komputer (2) (D)', 'Pemrograman Web (4) (A)',
      'Digunakan S-1 Sains Data', '', 'Struktur Data & Algoritma (2) (C)',
      '', 'Struktur Data & Algoritma (2) (B)', '',
    ],
    2: [
      'Kecerdasan Buatan (4) (B)', '', 'Expert System (6) (A)',
      'Organisasi Sistem Komputer (2) (D)', 'Pemrograman Web (4) (A)',
      'Digunakan S-1 Sains Data', 'Pengembangan Aplikasi (4) (D) P',
      'Struktur Data & Algoritma (2) (C)', '',
      'Struktur Data & Algoritma (2) (B)', '',
    ],
    3: [
      'Kecerdasan Buatan (4) (B)', '', 'Expert System (6) (A)',
      '', '', 'Digunakan S-1 Sains Data', '',
      'Struktur Data & Algoritma (2) (C)', '',
      'Struktur Data & Algoritma (2) (B)', '',
    ],
    4: [
      'Organisasi Sistem Komputer (2) (C)', '', 'Struktur Data & Algoritma (2) (B) P',
      '', '', 'Digunakan S-1 Sains Data', 'Pengembangan Aplikasi (4) (C) P',
      'Manajemen Sistem Informasi (2) (D)', 'Digunakan S-1 Sains Data', '', '',
    ],
    5: [
      'Organisasi Sistem Komputer (2) (C)', '', '',
      'Rekayasa Perangkat Lunak (4) (B) P', '', 'Digunakan S-1 Sains Data',
      '', 'Manajemen Sistem Informasi (2) (D)',
      'Digunakan S-1 Sains Data', '', '',
    ],
    6: [
      'Teori Bahasa & Automata (4) (C)', '', 'Rekayasa Perangkat Lunak (4) (B)',
      'Organisasi Sistem Komputer (2) (C) P', 'Struktur Data & Algoritma (2) (D)',
      'Metode Penelitian (6) (D)', 'Kecerdasan Buatan (4) (A)',
      'Aljabar Linier (2) (B)', '', 'Pengamanan Data Multimedia (6) (A)', '',
    ],
    7: [
      'Teori Bahasa & Automata (4) (C)', '', 'Rekayasa Perangkat Lunak (4) (B)',
      '', 'Struktur Data & Algoritma (2) (D)', 'Metode Penelitian (6) (D)',
      'Kecerdasan Buatan (4) (A)', 'Aljabar Linier (2) (B)', '',
      'Pengamanan Data Multimedia (6) (A)', '',
    ],
    8: [
      'Teori Bahasa & Automata (4) (C)', '', 'Rekayasa Perangkat Lunak (4) (B)',
      '', 'Struktur Data & Algoritma (2) (D)', 'Metode Penelitian (6) (D)',
      'Kecerdasan Buatan (4) (A)', 'Aljabar Linier (2) (B)', '',
      'Pengamanan Data Multimedia (6) (A)', '',
    ],
    9: ['', '', '', '', '', '', '', '', '', '', ''],
    10: ['', '', '', '', '', '', '', '', '', '', ''],
    11: ['', '', '', '', '', '', '', '', '', '', ''],
  },

  Kamis: {
    1: [
      'Kecerdasan Buatan (4) (C)', '', 'Pemrograman Web (4) (A) P',
      '', '', 'Digunakan S-1 Sains Data', '',
      'Teknik Multimedia (6) (A)', '', 'Manajemen Sistem Informasi (2) (B)',
      'Dipinjam OSK (D)',
    ],
    2: [
      'Kecerdasan Buatan (4) (C)', '', '',
      '', 'Pemrograman Web (4) (B) P', 'Digunakan S-1 Sains Data', '',
      'Teknik Multimedia (6) (A)', '', 'Manajemen Sistem Informasi (2) (B)',
      'Dipinjam OSK (D)',
    ],
    3: [
      'Kecerdasan Buatan (4) (C)', '', '',
      'Struktur Data & Algoritma (2) (C) P', '', 'Digunakan S-1 Sains Data', '',
      'Teknik Multimedia (6) (A)', '', 'Pendidikan Kewarganegaraan (2) (A)',
      'Pengembangan Aplikasi (4) (A)',
    ],
    4: [
      'Kapita Selekta Ilmu Komputer (6) (A)', '', '', '',
      'Pemrograman Web (4) (C) P', 'Digunakan S-1 Sains Data',
      'Jaringan Komputer (4) (B)', 'Pemrograman Web (4) (D)', '',
      'Pendidikan Kewarganegaraan (2) (A)', 'Pengembangan Aplikasi (4) (A)',
    ],
    5: [
      'Kapita Selekta Ilmu Komputer (6) (A)', '', 'Pengembangan Aplikasi (4) (A) P',
      '', '', 'Digunakan S-1 Sains Data', 'Jaringan Komputer (4) (B)',
      'Pemrograman Web (4) (D)', '', '', '',
    ],
    6: [
      'Jaminan Mutu Perangkat Lunak (6) (A)', '', '',
      'Rekayasa Perangkat Lunak (4) (A)', 'Jaringan Komputer (4) (B) P',
      'Rekayasa Perangkat Lunak (4) (C) P', '',
      'Struktur Data & Algoritma (2) (A)', '', 'Kalkulus II (2) (C)', '',
    ],
    7: [
      'Jaminan Mutu Perangkat Lunak (6) (A)', '', '',
      'Rekayasa Perangkat Lunak (4) (A)', 'Jaringan Komputer (4) (B) P',
      '', '', 'Struktur Data & Algoritma (2) (A)', '',
      'Kalkulus II (2) (C)', '',
    ],
    8: [
      'Jaminan Mutu Perangkat Lunak (6) (A)', '', 'Pengembangan Aplikasi (4) (B) P',
      'Rekayasa Perangkat Lunak (4) (A)', '', '', '',
      'Struktur Data & Algoritma (2) (A)', '', 'Kalkulus II (2) (C)', '',
    ],
    9: ['', '', '', '', '', '', '', '', '', '', ''],
    10: ['', '', '', '', '', '', '', '', '', '', ''],
    11: ['', '', '', '', '', '', '', '', '', '', ''],
  },

  Jumat: {
    1: [
      'Pengembangan Aplikasi (4) (D)', '', '', '',
      'Digunakan S-1 Sains Data', '', '', '', '', '',
      'Dipinjam Kalkulus II (2) (C)',
    ],
    2: [
      'Pengembangan Aplikasi (4) (D)', '', '', '',
      'Digunakan S-1 Sains Data', 'Teori Bahasa & Automata (4) (B)',
      'Metode Penelitian (6) (C)', 'Rekayasa Perangkat Lunak (4) (C)',
      '', 'Komputasi Cloud (6) (A)', 'Dipinjam Kalkulus II (2) (C)',
    ],
    3: [
      '', '', '', '', 'Digunakan S-1 Sains Data',
      'Teori Bahasa & Automata (4) (B)', 'Metode Penelitian (6) (C)',
      'Rekayasa Perangkat Lunak (4) (C)', '', 'Komputasi Cloud (6) (A)',
      'Dipinjam Kalkulus II (2) (C)',
    ],
    4: [
      '', '', '', '', '', 'Teori Bahasa & Automata (4) (B)',
      'Metode Penelitian (6) (C)', 'Rekayasa Perangkat Lunak (4) (C)',
      '', 'Komputasi Cloud (6) (A)', '',
    ],
    5: [
      'Teori Bahasa & Automata (4) (D)', '', '', '', '',
      'Manajemen Sistem Informasi (2) (A)', 'Jaringan Komputer (4) (C) P',
      'Natural Language Processing (6) (A)', '', '', '',
    ],
    6: [
      'Teori Bahasa & Automata (4) (D)', '', '', '', '',
      'Manajemen Sistem Informasi (2) (A)', 'Jaringan Komputer (4) (C) P',
      'Natural Language Processing (6) (A)', '', '', '',
    ],
    7: [
      'Teori Bahasa & Automata (4) (D)', '', '', '', '',
      'Struktur Data & Algoritma (2) (A) P', '',
      'Natural Language Processing (6) (A)', '', '', '',
    ],
    8: ['', '', '', '', '', '', '', '', '', '', ''],
    9: ['', '', '', '', '', '', '', '', '', '', ''],
    10: ['', '', '', '', '', '', '', '', '', '', ''],
    11: ['', '', '', '', '', '', '', '', '', '', ''],
  },
};

/**
 * Menentukan apakah sebuah slot adalah "dipinjam" oleh prodi/pihak lain
 */
function isBorrowed(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('dipinjam') ||
    lower.includes('di pinjam') ||
    lower.includes('digunakan s-1 sains data')
  );
}

/**
 * Mengubah data mentah menjadi array ScheduleSlot
 */
export function getScheduleForDay(day: Day): ScheduleSlot[] {
  const dayData = RAW_SCHEDULE[day];
  const slots: ScheduleSlot[] = [];

  for (let sesi = 1; sesi <= 11; sesi++) {
    const row = dayData[sesi];
    if (!row) continue;

    row.forEach((courseText, roomIdx) => {
      const room = ROOM_LIST[roomIdx];
      let trimmed = courseText.trim();

      let status: ScheduleSlot['status'];
      if (!trimmed || isBorrowed(trimmed)) {
        status = 'available';
        trimmed = '';
      } else {
        status = 'scheduled';
      }

      slots.push({
        day,
        session: sesi as SessionNumber,
        room,
        courseName: trimmed,
        status,
      });
    });
  }

  return slots;
}

/**
 * Mengambil data sebuah slot jadwal tertentu
 */
export function getSlotData(
  day: Day,
  session: SessionNumber,
  room: RoomName
): ScheduleSlot | null {
  const dayData = RAW_SCHEDULE[day];
  const row = dayData[session];
  if (!row) return null;

  const roomIdx = ROOM_LIST.indexOf(room);
  if (roomIdx === -1) return null;

  let courseText = row[roomIdx].trim();
  let status: ScheduleSlot['status'];
  if (!courseText || isBorrowed(courseText)) {
    status = 'available';
    courseText = '';
  } else {
    status = 'scheduled';
  }

  return { day, session, room, courseName: courseText, status };
}

/**
 * Mengecek apakah slot kosong (available) berdasarkan jadwal resmi
 */
export function isSlotAvailable(
  day: Day,
  session: SessionNumber,
  room: RoomName
): boolean {
  const slot = getSlotData(day, session, room);
  return slot?.status === 'available';
}
