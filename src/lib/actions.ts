'use server';

import {
  BookingFormData, BookingRequest, BookingStatus,
  Day, SessionNumber, RoomName, DAYS, ROOM_LIST,
  getSessionTimes, getWeekDates, ScheduleSlot
} from './types';

import {
  addBooking, getAllBookings, getBookingsByStatus,
  isSlotBooked, updateBookingStatus, getBookingStats,
  getBookingsForSlot, isSlotLocked, lockSlot, unlockSlot,
  deleteBooking, editBooking, getBookingById, getRoomUsageStats, deleteAllBookings,
} from './store';
import { cookies } from 'next/headers';
import { supabase, supabaseAdmin } from './supabase';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifyAdminSession as verifyAdmin, requireAdmin } from './auth-guard';

export { verifyAdmin, requireAdmin };

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Zod Schema for Booking ──────────────────────────────────
const bookingSchema = z.object({
  namaPJ: z.string().trim().min(2, 'Nama Penanggung Jawab min. 2 karakter.').max(100, 'Nama terlalu panjang.'),
  nim: z.string().trim().min(3, 'NIM min. 3 karakter.').max(30, 'NIM terlalu panjang.'),
  namaMatakuliah: z.string().trim().min(2, 'Nama Mata Kuliah min. 2 karakter.').max(100, 'Nama Mata Kuliah terlalu panjang.'),
  dosenPengampu: z.string().trim().min(2, 'Nama Dosen Pengampu min. 2 karakter.').max(100, 'Nama Dosen terlalu panjang.'),
  durasiPemakaian: z.number().int().min(1, 'Durasi pemakaian tidak valid.').max(11, 'Durasi maksimal 11 sesi.')
});

// ─── Submit Booking ──────────────────────────────────────────

export async function submitBooking(
  formData: BookingFormData
): Promise<ActionResult<BookingRequest>> {
  try {
    const parseResult = bookingSchema.safeParse(formData);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.issues[0].message };
    }

    // Validate all sessions covered by duration
    for (let i = 0; i < formData.durasiPemakaian; i++) {
      const s = (formData.session + i) as SessionNumber;
      if (s > 11) {
        return { success: false, message: 'Durasi melebihi batas jadwal (Sesi 11).' };
      }
      const locked = await isSlotLocked(formData.day, s, formData.room);
      if (locked) {
        return { success: false, message: `Sesi ${s} dikunci oleh admin.` };
      }
      const schedRes = await fetchScheduleForDay(formData.day);
      const isOfficialFilled = schedRes.success && schedRes.data && schedRes.data.some(d => d.session === s && d.room === formData.room && d.status !== 'available');
      if (isOfficialFilled) {
        return { success: false, message: `Sesi ${s} sudah terisi jadwal tetap resmi.` };
      }
      const st = await isSlotBooked(formData.day, s, formData.room);
      if (st.isApproved) {
        return { success: false, message: `Sesi ${s} sudah dipinjam.` };
      }
      if (st.isPending) {
        return { success: false, message: `Sesi ${s} sedang menunggu persetujuan booking lain.` };
      }
    }

    const booking = await addBooking({
      day: formData.day, session: formData.session, room: formData.room,
      namaPJ: formData.namaPJ.trim(),
      nim: formData.nim.trim(),
      durasiPemakaian: formData.durasiPemakaian,
      namaMatakuliah: formData.namaMatakuliah.trim(),
      dosenPengampu: formData.dosenPengampu.trim(),
    });

    if (!booking) {
      return { success: false, message: 'Gagal menyimpan booking ke database.' };
    }

    return {
      success: true,
      message: `Booking berhasil diajukan (ID: ${booking.id}). Mohon tunggu konfirmasi Admin Prodi.`,
      data: booking,
    };
  } catch (error) {
    console.error('submitBooking error:', error);
    return { success: false, message: 'Terjadi kesalahan server.' };
  }
}

// ─── Review Booking ──────────────────────────────────────────

export async function reviewBooking(
  bookingId: string, action: 'approved' | 'rejected', note?: string
): Promise<ActionResult<BookingRequest>> {
  try {
    await requireAdmin();
    const updated = await updateBookingStatus(bookingId, action, note);
    if (!updated) {
      return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    }
    const text = action === 'approved' ? 'disetujui' : 'ditolak';
    return { success: true, message: `Booking ${bookingId} telah ${text}.`, data: updated };
  } catch (error: any) {
    console.error('reviewBooking error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Terjadi kesalahan server.' };
  }
}

// ─── Delete Booking (Admin) ──────────────────────────────────

export async function removeBooking(bookingId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const ok = await deleteBooking(bookingId);
    if (!ok) return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    return { success: true, message: `Booking ${bookingId} berhasil dihapus.` };
  } catch (error: any) {
    console.error('removeBooking error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal menghapus booking.' };
  }
}

// ─── Edit Booking (Admin) ────────────────────────────────────

export async function updateBooking(
  bookingId: string,
  updates: { namaPJ?: string; namaMatakuliah?: string; dosenPengampu?: string; durasiPemakaian?: number }
): Promise<ActionResult<BookingRequest>> {
  try {
    await requireAdmin();
    const updated = await editBooking(bookingId, updates);
    if (!updated) return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    return { success: true, message: `Booking ${bookingId} berhasil diperbarui.`, data: updated };
  } catch (error: any) {
    console.error('updateBooking error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal memperbarui booking.' };
  }
}

// ─── Fetch Helpers ───────────────────────────────────────────

export async function fetchAllBookings(): Promise<ActionResult<BookingRequest[]>> {
  return { success: true, message: 'OK', data: await getAllBookings() };
}

export async function fetchBookingsByStatus(status: BookingStatus): Promise<ActionResult<BookingRequest[]>> {
  return { success: true, message: 'OK', data: await getBookingsByStatus(status) };
}

export async function fetchBookingStats(): Promise<ActionResult<ReturnType<typeof getBookingStats> extends Promise<infer U> ? U : never>> {
  return { success: true, message: 'OK', data: await getBookingStats() };
}

// ─── Slot Status (Bulk Fetch Optimized) ──────────────────────

export async function fetchDayOverrides(day: Day): Promise<ActionResult<Record<string, {
  status: 'scheduled' | 'borrowed' | 'available' | 'pending' | 'approved' | 'locked';
  courseName: string;
  booking?: BookingRequest;
}>>> {
  try {
    const overrides: Record<string, any> = {};
    const scheduleRes = await fetchScheduleForDay(day);
    const baseSlots = scheduleRes.success && scheduleRes.data ? scheduleRes.data : [];

    // Bulk fetch to prevent N+1 queries
    const { data: lockedSlotsData } = await supabase.from('locked_slots').select('*').eq('day', day);
    const lockedSlotsMap = new Map((lockedSlotsData || []).map((l: any) => [`${l.session}-${l.room}`, l]));

    const { data: bookingsData } = await supabase.from('bookings').select('*').eq('day', day).neq('status', 'rejected');
    const bookingsList = (bookingsData || []) as BookingRequest[];

    // Map ALL slots from the DB as overrides to replace the hardcoded base layer
    for (const slot of baseSlots) {
      overrides[`${day}-${slot.session}-${slot.room}`] = { status: slot.status, courseName: slot.courseName };
    }

    for (const slot of baseSlots) {
      const locked = lockedSlotsMap.get(`${slot.session}-${slot.room}`);
      if (locked) {
        overrides[`${day}-${slot.session}-${slot.room}`] = { status: 'locked', courseName: locked.note || 'Dikunci' };
        continue;
      }

      if (slot.status === 'available') {
        const slotBookings = bookingsList.filter(b => b.room === slot.room && slot.session >= b.session && slot.session < b.session + b.durasiPemakaian);
        
        if (slotBookings.some(b => b.status === 'approved')) {
          const b = slotBookings.find(b => b.status === 'approved');
          overrides[`${day}-${slot.session}-${slot.room}`] = { status: 'approved', courseName: b?.namaMatakuliah || 'Dipinjam', booking: b };
        } else if (slotBookings.some(b => b.status === 'pending')) {
          const b = slotBookings.find(b => b.status === 'pending');
          overrides[`${day}-${slot.session}-${slot.room}`] = { status: 'pending', courseName: b?.namaMatakuliah || 'Menunggu', booking: b };
        }
      }
    }
    return { success: true, message: 'OK', data: overrides };
  } catch (error) {
    console.error('fetchDayOverrides error:', error);
    return { success: false, message: 'Error.' };
  }
}

// ─── Lock Toggle (Per Slot) ──────────────────────────────────

export async function toggleSlotLock(
  day: Day, session: SessionNumber, room: RoomName,
  isLocking: boolean, note?: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (isLocking) {
      await lockSlot(day, session, room, note);
      return { success: true, message: 'Slot ruangan berhasil dikunci.' };
    } else {
      await unlockSlot(day, session, room);
      return { success: true, message: 'Kunci slot ruangan dibuka.' };
    }
  } catch (error: any) {
    console.error('toggleSlotLock error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal mengubah status kunci slot.' };
  }
}

// ─── Advanced Room Locking (Full Room) ───────────────────────

import { lockRoomFull, unlockRoomFull } from './roomLocking';

export async function setRoomLockFull(
  room: RoomName,
  type: 'day' | 'week' | 'permanent',
  dates: string[],
  note?: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const success = await lockRoomFull(room, type, dates, note);
    if (!success) return { success: false, message: 'Gagal mengunci ruangan.' };
    
    return { success: true, message: 'Ruangan berhasil dikunci.' };
  } catch (error: any) {
    console.error('setRoomLockFull error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal mengunci ruangan.' };
  }
}

export async function removeRoomLockFull(room: RoomName): Promise<ActionResult> {
  try {
    await requireAdmin();
    const success = await unlockRoomFull(room);
    if (!success) return { success: false, message: 'Gagal membuka kunci ruangan.' };
    
    return { success: true, message: 'Kunci ruangan berhasil dibuka.' };
  } catch (error: any) {
    console.error('removeRoomLockFull error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal membuka kunci ruangan.' };
  }
}

import { getLockedRoomsForDate, LockedRoom } from './roomLocking';

export async function fetchLockedRoomsForDate(dateStr: string): Promise<{ success: boolean; data?: LockedRoom[] }> {
  try {
    const rooms = await getLockedRoomsForDate(dateStr);
    return { success: true, data: rooms };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

// ─── 5-Day Available Rooms (Bulk Fetch Optimized) ────────────

export async function getAvailableRoomsSummary(): Promise<
  ActionResult<Record<Day, { session: SessionNumber; room: RoomName; time: string }[]>>
> {
  try {
    const summary: Record<Day, { session: SessionNumber; room: RoomName; time: string }[]> = {
      Senin: [], Selasa: [], Rabu: [], Kamis: [], Jumat: []
    };

    // Bulk fetch ALL data to avoid sequential queries in loop
    const { data: lockedSlotsData } = await supabase.from('locked_slots').select('*');
    const { data: bookingsData } = await supabase.from('bookings').select('*').neq('status', 'rejected');
    const { data: officialSchedulesData } = await supabase.from('official_schedules').select('*');
    
    const dates = getWeekDates();
    const dateStrings = DAYS.map(d => dates[d].dateObj.toISOString().split('T')[0]);
    const { data: fullLockedData } = await supabase.from('locked_rooms')
      .select('*')
      .or(`is_permanent.eq.true,locked_date.in.(${dateStrings.join(',')})`);

    const allLocked = lockedSlotsData || [];
    const allBookings = (bookingsData || []) as BookingRequest[];
    const allFullLocked = fullLockedData || [];
    const allOfficialSchedules = officialSchedulesData || [];

    for (const day of DAYS) {
      const sessionTimes = getSessionTimes(day);
      const currentDateStr = dates[day].dateObj.toISOString().split('T')[0];

      for (let s = 1; s <= 11; s++) {
        for (const room of ROOM_LIST) {
          // Check official schedule
          const isScheduled = allOfficialSchedules.some(os => os.day === day && os.session === s && os.room === room);
          if (isScheduled) continue; // Not available

          // Check full room lock
          const isRoomLocked = allFullLocked.some(l => l.room === room && (l.is_permanent || l.locked_date === currentDateStr));
          if (isRoomLocked) continue;

          // Check slot lock
          const isLocked = allLocked.some((l: any) => l.day === day && l.session === s && l.room === room);
          if (isLocked) continue;

          // Check bookings
          const hasBooking = allBookings.some((b) => b.day === day && b.room === room && s >= b.session && s < b.session + b.durasiPemakaian);
          if (hasBooking) continue;

          // If we reach here, the slot is available
          const st = sessionTimes.find(t => t.sesi === s);
          summary[day].push({
            session: s as SessionNumber,
            room: room as RoomName,
            time: `${st?.jamMulai} – ${st?.jamAkhir}`
          });
        }
      }
    }

    return { success: true, message: 'OK', data: summary };
  } catch (error) {
    console.error('getAvailableRoomsSummary error:', error);
    return { success: false, message: 'Gagal memuat.' };
  }
}

// ─── Room Usage Stats ────────────────────────────────────────

export async function fetchRoomStats(): Promise<
  ActionResult<{ room: RoomName; bookedCount: number; approvedCount: number }[]>
> {
  return { success: true, message: 'OK', data: await getRoomUsageStats() };
}

// ─── Auth ────────────────────────────────────────────────────

export async function loginAdmin(password: string): Promise<ActionResult> {
  try {
    const hash = process.env.ADMIN_PASSWORD_HASH || '';
    const cleanHash = hash.replace(/\\/g, ''); // Fix double escaping if necessary
    
    const match = await bcrypt.compare(password, cleanHash);
    if (match) {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
      
      const { error } = await supabaseAdmin.from('admin_sessions').insert([{ 
        token, 
        expires_at: expiresAt.toISOString() 
      }]);
      
      if (error) {
        console.error('Failed to create session:', error);
        return { success: false, message: 'Terjadi kesalahan sistem' };
      }

      const cookieStore = await cookies();
      cookieStore.set('admin_session', token, { 
        httpOnly: true, 
        path: '/',
        expires: expiresAt,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return { success: true, message: 'Login berhasil' };
    }
    return { success: false, message: 'Password salah' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Terjadi kesalahan sistem saat login' };
  }
}

export async function logoutAdmin(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (token) {
      await supabaseAdmin.from('admin_sessions').delete().eq('token', token);
    }
    cookieStore.delete('admin_session');
    return { success: true, message: 'Logout berhasil' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Gagal logout' };
  }
}

// verifyAdmin dan requireAdmin sekarang diekspor dari auth-guard.ts di bagian atas file.

export async function resetWeeklyBookings(): Promise<ActionResult> {
  try {
    await requireAdmin();
    const ok = await deleteAllBookings();
    if (!ok) return { success: false, message: 'Gagal menghapus riwayat peminjaman.' };
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    return { success: true, message: 'Semua riwayat booking berhasil dihapus untuk memulai minggu baru.' };
  } catch (error) {
    console.error('resetWeeklyBookings error:', error);
    return { success: false, message: 'Gagal membersihkan riwayat.' };
  }
}

// ─── Sync SIGenerate (Web Scraping) ──────────────────────────

import * as cheerio from 'cheerio';
import { revalidatePath } from 'next/cache';

export async function syncSIGenerate(tahunAjar: string = '2024', idSemester: string = '1'): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!/^\d{4}$/.test(tahunAjar) || !['1', '2'].includes(idSemester)) {
      return { success: false, message: 'Parameter tahun ajar atau semester tidak valid.' };
    }

    let totalSynced = 0;
    const toInsert: any[] = [];

    const mainRes = await fetch('https://jadwal.uns.ac.id/jadwal');
    const mainHtml = await mainRes.text();
    const csrfMatch = mainHtml.match(/<meta name="csrf-token" content="([^"]+)">/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    const rawCookies = mainRes.headers.get('set-cookie');
    let cookieString = '';
    if (rawCookies) {
      const parts = rawCookies.split(',').map(c => c.split(';')[0].trim());
      cookieString = parts.join('; ');
    }

    const prodiParams = new URLSearchParams();
    prodiParams.append('_csrf-frontend', csrfToken);
    prodiParams.append('depdrop_parents[]', '20');

    const prodiRes = await fetch('https://jadwal.uns.ac.id/dosen/listprodi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://jadwal.uns.ac.id/jadwal'
      },
      body: prodiParams.toString()
    });

    const prodiData = await prodiRes.json();
    if (!prodiData || !prodiData.output) throw new Error("Gagal mengambil data Prodi");

    for (const prodi of prodiData.output) {
      if (prodi.name.toLowerCase().includes('psdku')) continue;

      const cetakParams = new URLSearchParams();
      cetakParams.append('_csrf-frontend', csrfToken);
      cetakParams.append('FAKULTAS[IDFAKULTAS]', '20');
      cetakParams.append('PRODI[IDPRODI]', prodi.id);
      cetakParams.append('TAS[TAHUNAJAR]', tahunAjar);
      cetakParams.append('TAS[IDSEMESTER]', idSemester);
      cetakParams.append('SEMESTER[IDSEMESTER]', '');

      const cetakRes = await fetch('https://jadwal.uns.ac.id/jadwal/cetak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieString,
          'Referer': 'https://jadwal.uns.ac.id/jadwal'
        },
        body: cetakParams.toString()
      });

      const cetakHtml = await cetakRes.text();
      const $ = cheerio.load(cetakHtml);

      $('table.table tbody tr').each((_, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 11) {
          const hari = $(tds[1]).text().trim();
          const sesi = parseInt($(tds[2]).text().trim(), 10);
          const mataKuliah = $(tds[4]).text().trim();
          const semester = $(tds[6]).text().trim();
          const ruang = $(tds[9]).text().trim();
          const kelas = $(tds[10]).text().trim();

          let matchedRoom = undefined;
          const rLow = ruang.toLowerCase();

          if (rLow.includes('b4-11') || rLow.includes('b4.11')) matchedRoom = 'B4-11';
          else if (rLow.includes('b4-12') || rLow.includes('b4.12')) matchedRoom = 'B4-12';
          else if (rLow.includes('b4-10') || rLow.includes('b4.10')) matchedRoom = 'B4-10';
          else if (rLow.includes('b4-06') || rLow.includes('b4.06')) matchedRoom = 'B4.06';
          else if (rLow.includes('b4.05') || rLow.includes('b4-05')) matchedRoom = 'Lab B4.05';
          else if (rLow.includes('b0.04') || rLow.includes('b4.04') || rLow.includes('b4-04')) matchedRoom = 'Lab B4.04';
          else if (rLow.includes('pasca 1301') || rLow.includes('1301') || rLow === 'pasca 01') matchedRoom = 'Pasca 1301';
          else if (rLow.includes('pasca 1312') || rLow.includes('1312') || rLow === 'pasca 02') matchedRoom = 'Pasca 1312';
          else if (rLow.includes('pasca 1304') || rLow.includes('1304') || rLow === 'pasca 04') matchedRoom = 'Pasca 1304';
          else if (rLow.includes('puskom 1') || rLow.includes('tik 1') || rLow.includes('tik lt.3')) matchedRoom = 'Lab 3 TIK Lt.3';
          else if (rLow.includes('puskom 2') || rLow.includes('tik 2') || rLow.includes('tik lt.4')) matchedRoom = 'Lab 4 TIK Lt.4';
          else {
            matchedRoom = ROOM_LIST.find(r => r.toLowerCase() === rLow);
          }

          if (matchedRoom && hari && !isNaN(sesi)) {
            toInsert.push({
              day: hari,
              session: sesi,
              room: matchedRoom,
              course_name: `${mataKuliah} (${kelas}) (Semester ${semester})`
            });
          }
        }
      });
    }

    if (toInsert.length > 0) {
      await supabaseAdmin.from('official_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await supabaseAdmin.from('official_schedules').insert(toInsert);
      if (error) throw new Error(error.message);
      totalSynced = toInsert.length;
    }

    revalidatePath('/');
    return { success: true, message: `Berhasil sinkronisasi ${totalSynced} jadwal dari SIGenerate ke database.` };
  } catch (error) {
    console.error('syncSIGenerate error:', error);
    return { success: false, message: 'Gagal melakukan sinkronisasi dengan server SIGenerate.' };
  }
}

export async function fetchScheduleForDay(day: Day): Promise<ActionResult<ScheduleSlot[]>> {
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('official_schedules')
      .select('*')
      .eq('day', day);

    if (error) throw new Error(error.message);

    const slots: ScheduleSlot[] = [];
    for (let s = 1; s <= 11; s++) {
      ROOM_LIST.forEach(room => {
        const dbSlot = (data || []).find(d => d.session === s && d.room === room);
        if (dbSlot) {
          slots.push({
            day,
            session: s as SessionNumber,
            room,
            courseName: dbSlot.course_name,
            status: dbSlot.course_name.toLowerCase().includes('dipinjam') || dbSlot.course_name.toLowerCase().includes('digunakan') ? 'borrowed' : 'scheduled'
          });
        } else {
          slots.push({
            day,
            session: s as SessionNumber,
            room,
            courseName: '',
            status: 'available'
          });
        }
      });
    }
    return { success: true, message: 'Berhasil mengambil jadwal dari database.', data: slots };

  } catch (error) {
    console.error('fetchScheduleForDay error:', error);
    const slots: ScheduleSlot[] = [];
    for (let s = 1; s <= 11; s++) {
      ROOM_LIST.forEach(room => {
        slots.push({ day, session: s as SessionNumber, room, courseName: '', status: 'available' });
      });
    }
    return { success: false, message: 'Gagal mengambil jadwal resmi', data: slots };
  }
}

export async function autoCleanOldBookings() {
  try {
    const d = new Date();
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    const diff = day === 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    const cutoff = d.toISOString();
    
    // Automatically delete bookings older than the most recent Saturday
    const { supabaseAdmin: adminDb } = await import('./supabase');
    await adminDb.from('bookings').delete().lt('createdAt', cutoff);
  } catch (error) {
    console.error('Auto clean failed:', error);
  }
}

// ─── Manual Official Schedule Management (CRUD) ─────────────

export async function addOfficialSchedule(
  day: Day, session: SessionNumber, room: RoomName, courseName: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!courseName || courseName.trim().length < 2) {
      return { success: false, message: 'Nama mata kuliah minimal 2 karakter.' };
    }

    // Check for duplicates
    const { data: existing } = await supabaseAdmin
      .from('official_schedules')
      .select('id')
      .eq('day', day)
      .eq('session', session)
      .eq('room', room)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, message: 'Slot ini sudah memiliki jadwal resmi. Gunakan fitur edit untuk mengubahnya.' };
    }

    const { error } = await supabaseAdmin.from('official_schedules').insert([{
      day,
      session,
      room,
      course_name: courseName.trim()
    }]);

    if (error) throw new Error(error.message);

    revalidatePath('/');
    return { success: true, message: 'Jadwal resmi berhasil ditambahkan.' };
  } catch (error: any) {
    console.error('addOfficialSchedule error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal menambahkan jadwal resmi.' };
  }
}

export async function editOfficialSchedule(
  day: Day, session: SessionNumber, room: RoomName, newCourseName: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!newCourseName || newCourseName.trim().length < 2) {
      return { success: false, message: 'Nama mata kuliah minimal 2 karakter.' };
    }

    const { data, error } = await supabaseAdmin
      .from('official_schedules')
      .update({ course_name: newCourseName.trim() })
      .eq('day', day)
      .eq('session', session)
      .eq('room', room)
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return { success: false, message: 'Jadwal resmi tidak ditemukan pada slot ini.' };
    }

    revalidatePath('/');
    return { success: true, message: 'Jadwal resmi berhasil diperbarui.' };
  } catch (error: any) {
    console.error('editOfficialSchedule error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal memperbarui jadwal resmi.' };
  }
}

export async function deleteOfficialSchedule(
  day: Day, session: SessionNumber, room: RoomName
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from('official_schedules')
      .delete()
      .eq('day', day)
      .eq('session', session)
      .eq('room', room)
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return { success: false, message: 'Jadwal resmi tidak ditemukan pada slot ini.' };
    }

    revalidatePath('/');
    return { success: true, message: 'Jadwal resmi berhasil dihapus.' };
  } catch (error: any) {
    console.error('deleteOfficialSchedule error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal menghapus jadwal resmi.' };
  }
}

// ─── Announcements (Pengumuman) ──────────────────────────────

export type AnnouncementType = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export async function createAnnouncement(
  title: string, message: string, type: AnnouncementType, durationHours: number
): Promise<ActionResult<Announcement>> {
  try {
    await requireAdmin();

    if (!title || title.trim().length < 2) return { success: false, message: 'Judul minimal 2 karakter.' };
    if (!message || message.trim().length < 2) return { success: false, message: 'Pesan minimal 2 karakter.' };
    if (durationHours <= 0) return { success: false, message: 'Durasi tidak valid.' };

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + durationHours * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin.from('announcements').insert([{
      title: title.trim(),
      message: message.trim(),
      type,
      is_active: true,
      expires_at: expiresAt.toISOString()
    }]).select().single();

    if (error) throw new Error(error.message);

    revalidatePath('/');
    return { success: true, message: 'Pengumuman berhasil dibuat.', data };
  } catch (error: any) {
    console.error('createAnnouncement error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal membuat pengumuman.' };
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    return { success: true, message: 'Pengumuman berhasil dihapus.' };
  } catch (error: any) {
    console.error('deleteAnnouncement error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal menghapus pengumuman.' };
  }
}

export async function toggleAnnouncementActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();

    const { error } = await supabaseAdmin.from('announcements').update({ is_active: isActive }).eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    return { success: true, message: isActive ? 'Pengumuman diaktifkan.' : 'Pengumuman dinonaktifkan.' };
  } catch (error: any) {
    console.error('toggleAnnouncementActive error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal mengubah status pengumuman.' };
  }
}

export async function fetchActiveAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, message: 'OK', data: data || [] };
  } catch (error) {
    console.error('fetchActiveAnnouncements error:', error);
    return { success: false, message: 'Gagal memuat pengumuman.', data: [] };
  }
}

export async function fetchAllAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, message: 'OK', data: data || [] };
  } catch (error: any) {
    console.error('fetchAllAnnouncements error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal memuat pengumuman.', data: [] };
  }
}
