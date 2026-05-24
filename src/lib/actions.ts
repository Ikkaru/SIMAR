'use server';

// ============================================================
// SIMAR V3 — Server Actions (Supabase Optimized)
// ============================================================

import {
  BookingFormData, BookingRequest, BookingStatus,
  Day, SessionNumber, RoomName, DAYS, ROOM_LIST,
  getSessionTimes,
} from './types';
import { isSlotAvailable, getSlotData, getScheduleForDay } from './scheduleData';
import {
  addBooking, getAllBookings, getBookingsByStatus,
  isSlotBooked, updateBookingStatus, getBookingStats,
  getBookingsForSlot, isSlotLocked, lockSlot, unlockSlot,
  deleteBooking, editBooking, getBookingById, getRoomUsageStats,
} from './store';
import { cookies } from 'next/headers';
import { supabase } from './supabase';

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Submit Booking ──────────────────────────────────────────

export async function submitBooking(
  formData: BookingFormData
): Promise<ActionResult<BookingRequest>> {
  try {
    if (!formData.namaPJ || formData.namaPJ.trim().length < 2) {
      return { success: false, message: 'Nama Penanggung Jawab harus diisi (min. 2 karakter).' };
    }
    if (!formData.namaMatakuliah || formData.namaMatakuliah.trim().length < 2) {
      return { success: false, message: 'Nama Mata Kuliah harus diisi (min. 2 karakter).' };
    }
    if (!formData.dosenPengampu || formData.dosenPengampu.trim().length < 2) {
      return { success: false, message: 'Nama Dosen Pengampu harus diisi (min. 2 karakter).' };
    }
    if (!formData.durasiPemakaian || formData.durasiPemakaian < 1 || formData.durasiPemakaian > 11) {
      return { success: false, message: 'Durasi pemakaian tidak valid.' };
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
      if (!isSlotAvailable(formData.day, s, formData.room)) {
        return { success: false, message: `Sesi ${s} sudah terisi jadwal resmi.` };
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
    const updated = await updateBookingStatus(bookingId, action, note);
    if (!updated) {
      return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    }
    const text = action === 'approved' ? 'disetujui' : 'ditolak';
    return { success: true, message: `Booking ${bookingId} telah ${text}.`, data: updated };
  } catch (error) {
    console.error('reviewBooking error:', error);
    return { success: false, message: 'Terjadi kesalahan server.' };
  }
}

// ─── Delete Booking (Admin) ──────────────────────────────────

export async function removeBooking(bookingId: string): Promise<ActionResult> {
  try {
    const ok = await deleteBooking(bookingId);
    if (!ok) return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    return { success: true, message: `Booking ${bookingId} berhasil dihapus.` };
  } catch (error) {
    console.error('removeBooking error:', error);
    return { success: false, message: 'Gagal menghapus booking.' };
  }
}

// ─── Edit Booking (Admin) ────────────────────────────────────

export async function updateBooking(
  bookingId: string,
  updates: { namaPJ?: string; namaMatakuliah?: string; dosenPengampu?: string; durasiPemakaian?: number }
): Promise<ActionResult<BookingRequest>> {
  try {
    const updated = await editBooking(bookingId, updates);
    if (!updated) return { success: false, message: `Booking ${bookingId} tidak ditemukan.` };
    return { success: true, message: `Booking ${bookingId} berhasil diperbarui.`, data: updated };
  } catch (error) {
    console.error('updateBooking error:', error);
    return { success: false, message: 'Gagal memperbarui booking.' };
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
    const baseSlots = getScheduleForDay(day);

    // Bulk fetch to prevent N+1 queries
    const { data: lockedSlotsData } = await supabase.from('locked_slots').select('*').eq('day', day);
    const lockedSlotsMap = new Map((lockedSlotsData || []).map((l: any) => [`${l.session}-${l.room}`, l]));

    const { data: bookingsData } = await supabase.from('bookings').select('*').eq('day', day).neq('status', 'rejected');
    const bookingsList = (bookingsData || []) as BookingRequest[];

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

// ─── Lock Toggle ─────────────────────────────────────────────

export async function toggleSlotLock(
  day: Day, session: SessionNumber, room: RoomName,
  isLocking: boolean, note?: string
): Promise<ActionResult> {
  try {
    if (isLocking) {
      await lockSlot(day, session, room, note);
      return { success: true, message: 'Ruangan berhasil dikunci.' };
    } else {
      await unlockSlot(day, session, room);
      return { success: true, message: 'Kunci ruangan dibuka.' };
    }
  } catch (error) {
    console.error('toggleSlotLock error:', error);
    return { success: false, message: 'Gagal mengubah status kunci.' };
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

    // Bulk fetch ALL locks and active bookings once
    const { data: lockedSlotsData } = await supabase.from('locked_slots').select('*');
    const { data: bookingsData } = await supabase.from('bookings').select('*').neq('status', 'rejected');
    
    const allLocked = lockedSlotsData || [];
    const allBookings = (bookingsData || []) as BookingRequest[];

    for (const day of DAYS) {
      const baseSlots = getScheduleForDay(day);
      const sessionTimes = getSessionTimes(day);

      for (const slot of baseSlots) {
        if (slot.status === 'available') {
          const isLocked = allLocked.some((l: any) => l.day === day && l.session === slot.session && l.room === slot.room);
          const hasBooking = allBookings.some((b) => b.day === day && b.room === slot.room && slot.session >= b.session && slot.session < b.session + b.durasiPemakaian);

          if (!isLocked && !hasBooking) {
            const st = sessionTimes.find(s => s.sesi === slot.session);
            summary[day].push({
              session: slot.session,
              room: slot.room,
              time: `${st?.jamMulai} – ${st?.jamAkhir}`
            });
          }
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
  if (password === 'admin') {
    const cookieStore = await cookies();
    cookieStore.set('admin_token', 'authenticated', { httpOnly: true, path: '/' });
    return { success: true, message: 'Login berhasil' };
  }
  return { success: false, message: 'Password salah' };
}

export async function logoutAdmin(): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  return { success: true, message: 'Logout berhasil' };
}

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === 'authenticated';
}
