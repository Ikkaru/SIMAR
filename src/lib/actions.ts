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
  deleteBooking, editBooking, getBookingById, getRoomUsageStats, deleteAllBookings, deletePendingBookings,
} from './store';
import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifyAdminSession as verifyAdmin, requireAdmin } from './auth-guard';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export { verifyAdmin, requireAdmin };

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redisConfigured = url && token;
const redis = redisConfigured ? new Redis({ url, token }) : null;

const ratelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "30 m"),
  analytics: true,
}) : null;

const BAN_PREFIX = "banned_device:";
const FAILED_ATTEMPT_PREFIX = "failed_attempts_device:";

async function checkRateLimit(): Promise<ActionResult<any> | null> {
  // Pengecualian untuk Admin: Bebas dari rate limit
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  if (sessionToken) {
    const session = await prisma.adminSession.findUnique({ where: { token: sessionToken } });
    if (session && session.expiresAt > new Date()) return null;
  }

  if (!redis || !ratelimit) return null;

  // Deteksi atau buat Device ID
  let deviceId = cookieStore.get('device_id')?.value;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    cookieStore.set('device_id', deviceId, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 tahun
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  try {
    const isBanned = await redis.get(`${BAN_PREFIX}${deviceId}`);
    if (isBanned) {
      return { success: false, message: "Akses diblokir sementara karena aktivitas mencurigakan. Silakan coba lagi dalam 10 jam." };
    }

    const { success } = await ratelimit.limit(`ratelimit_${deviceId}`);

    if (!success) {
      const failedAttemptsKey = `${FAILED_ATTEMPT_PREFIX}${deviceId}`;
      const failedAttempts = await redis.incr(failedAttemptsKey);
      
      if (failedAttempts === 1) {
        await redis.expire(failedAttemptsKey, 1800);
      }

      if (failedAttempts > 3) {
        await redis.setex(`${BAN_PREFIX}${deviceId}`, 36000, "banned");
        return { success: false, message: "Akses diblokir sementara karena aktivitas mencurigakan. Silakan coba lagi dalam 10 jam." };
      }

      return { success: false, message: "Terlalu banyak request. Harap tunggu 30 menit sebelum mencoba lagi." };
    }
  } catch (error) {
    console.error("Rate Limit Error:", error);
  }
  return null;
}

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
    const rlCheck = await checkRateLimit();
    if (rlCheck) return rlCheck;

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
      return { success: false, message: 'Slot sudah terisi atau gagal menyimpan booking ke database.' };
    }

    return {
      success: true,
      message: `Booking berhasil diajukan (ID: ${booking.id}). Mohon tunggu konfirmasi Admin Prodi.`,
      data: booking,
    };
  } catch (error: any) {
    console.error('submitBooking error:', error);
    return { success: false, message: error.message || 'Terjadi kesalahan server.' };
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
    const lockedSlotsData = await prisma.lockedSlot.findMany({ where: { day } });
    const lockedSlotsMap = new Map((lockedSlotsData || []).map((l) => [`${l.session}-${l.room}`, l]));

    const bookingsList = await prisma.booking.findMany({ where: { day, status: { not: 'rejected' } } }) as BookingRequest[];

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
  type: 'day' | 'week' | 'permanent' | 'custom',
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
    const allLocked = await prisma.lockedSlot.findMany();
    const bookingsData = await prisma.booking.findMany({ where: { status: { not: 'rejected' } } });
    const allOfficialSchedules = await prisma.officialSchedule.findMany();
    
    const dates = getWeekDates();
    const dateStrings = DAYS.map(d => dates[d].dateObj.toISOString().split('T')[0]);
    
    const allFullLocked = await prisma.lockedRoom.findMany({
      where: {
        OR: [
          { isPermanent: true },
          { lockedDate: { in: dateStrings } }
        ]
      }
    });

    const allBookings = bookingsData as BookingRequest[];

    for (const day of DAYS) {
      const sessionTimes = getSessionTimes(day);
      const currentDateStr = dates[day].dateObj.toISOString().split('T')[0];

      for (let s = 1; s <= 11; s++) {
        for (const room of ROOM_LIST) {
          // Check official schedule
          const isScheduled = allOfficialSchedules.some(os => os.day === day && os.session === s && os.room === room);
          if (isScheduled) continue; // Not available

          // Check full room lock
          const isRoomLocked = allFullLocked.some(l => l.room === room && (l.isPermanent || l.lockedDate === currentDateStr));
          if (isRoomLocked) continue;

          // Check slot lock
          const isLocked = allLocked.some((l) => l.day === day && l.session === s && l.room === room);
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

// Cooldown progresif: setiap kelipatan 15 kali gagal, durasi blokir meningkat
const COOLDOWN_MINUTES = [5, 15, 30, 60]; // index 0 = gagal 15x, index 1 = gagal 30x, dst.
const MAX_ATTEMPTS_PER_TIER = 15;

function getCooldownMinutes(attempts: number): number {
  const tierIndex = Math.floor((attempts - 1) / MAX_ATTEMPTS_PER_TIER);
  return COOLDOWN_MINUTES[Math.min(tierIndex, COOLDOWN_MINUTES.length - 1)];
}

export async function loginAdmin(password: string): Promise<ActionResult> {
  try {
    // 1. Deteksi IP address
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 2. Cek apakah IP sedang diblokir (pre-flight, sebelum bcrypt)
    const attempt = await prisma.loginAttempt.findUnique({ where: { ip } });
    if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) {
      const remainingSec = Math.ceil((attempt.blockedUntil.getTime() - Date.now()) / 1000);
      const remainingMin = Math.ceil(remainingSec / 60);
      return {
        success: false,
        message: `Terlalu banyak percobaan login. Coba lagi dalam ${remainingMin} menit.`
      };
    }

    // 3. Auto-seed: jika tabel Admin kosong, buat admin pertama dari env
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const envHash = process.env.ADMIN_PASSWORD_HASH || '';
      const cleanHash = envHash.replace(/\\/g, '');
      if (cleanHash) {
        await prisma.admin.create({
          data: { username: 'admin', password: cleanHash }
        });
      }
    }

    // 4. Ambil data admin dari database
    const admin = await prisma.admin.findUnique({ where: { username: 'admin' } });
    if (!admin) {
      return { success: false, message: 'Akun admin belum dikonfigurasi.' };
    }

    // 5. Verifikasi password
    const match = await bcrypt.compare(password, admin.password);

    if (match) {
      // Login berhasil: hapus catatan percobaan gagal
      await prisma.loginAttempt.delete({ where: { ip } }).catch(() => {});

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.adminSession.create({ data: { token, expiresAt } });

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

    // 6. Password salah: update counter percobaan gagal
    const currentAttempts = (attempt?.attempts ?? 0) + 1;
    let blockedUntil: Date | null = null;

    // Terapkan cooldown setiap kelipatan 3
    if (currentAttempts % MAX_ATTEMPTS_PER_TIER === 0) {
      const cooldown = getCooldownMinutes(currentAttempts);
      blockedUntil = new Date(Date.now() + cooldown * 60 * 1000);
    }

    await prisma.loginAttempt.upsert({
      where: { ip },
      create: { ip, attempts: currentAttempts, blockedUntil },
      update: { attempts: currentAttempts, blockedUntil }
    });

    // Hitung sisa percobaan sebelum cooldown berikutnya
    const attemptsUntilBlock = MAX_ATTEMPTS_PER_TIER - (currentAttempts % MAX_ATTEMPTS_PER_TIER);
    const nextCooldown = getCooldownMinutes(currentAttempts + attemptsUntilBlock);

    if (blockedUntil) {
      const cooldownMin = getCooldownMinutes(currentAttempts);
      return {
        success: false,
        message: `Password salah. Akun diblokir selama ${cooldownMin} menit karena terlalu banyak percobaan.`
      };
    }

    return {
      success: false,
      message: 'Password salah'
    };
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
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
    }
    cookieStore.delete('admin_session');
    return { success: true, message: 'Logout berhasil' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Gagal logout' };
  }
}

// verifyAdmin dan requireAdmin sekarang diekspor dari auth-guard.ts di bagian atas file.

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password baru minimal 6 karakter.' };
    }

    const admin = await prisma.admin.findUnique({ where: { username: 'admin' } });
    if (!admin) {
      return { success: false, message: 'Akun admin tidak ditemukan.' };
    }

    const match = await bcrypt.compare(oldPassword, admin.password);
    if (!match) {
      return { success: false, message: 'Password lama salah.' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { username: 'admin' },
      data: { password: newHash }
    });

    return { success: true, message: 'Password berhasil diubah.' };
  } catch (error: any) {
    console.error('changeAdminPassword error:', error);
    return {
      success: false,
      message: error.message === 'Unauthorized: Admin authentication required.'
        ? error.message
        : 'Gagal mengubah password.'
    };
  }
}

export async function resetWeeklyBookings(type: 'all' | 'pending' = 'all'): Promise<ActionResult> {
  try {
    await requireAdmin();
    const ok = type === 'all' ? await deleteAllBookings() : await deletePendingBookings();
    if (!ok) return { success: false, message: 'Gagal menghapus riwayat peminjaman.' };
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    return { success: true, message: type === 'all' ? 'Semua riwayat booking berhasil dihapus.' : 'Semua request pending berhasil dihapus.' };
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
              courseName: `${mataKuliah} (${kelas}) (Semester ${semester})`
            });
          }
        }
      });
    }

    // Deduplicate: if same slot appears twice (rare edge case), keep the last one
    const uniqueSchedules = new Map<string, any>();
    for (const item of toInsert) {
      const key = `${item.day}-${item.session}-${item.room}`;
      if (uniqueSchedules.has(key)) {
        console.warn(`Duplicate schedule slot detected: ${key} — overwriting with latest entry`);
      }
      uniqueSchedules.set(key, { ...item });
    }
    const deduplicatedToInsert = Array.from(uniqueSchedules.values());

    if (deduplicatedToInsert.length > 0) {
      await prisma.$transaction([
        prisma.officialSchedule.deleteMany({}),
        prisma.officialSchedule.createMany({ data: deduplicatedToInsert })
      ]);
      totalSynced = deduplicatedToInsert.length;
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
    const data = await prisma.officialSchedule.findMany({ where: { day } });

    const slots: ScheduleSlot[] = [];
    for (let s = 1; s <= 11; s++) {
      ROOM_LIST.forEach(room => {
        const dbSlot = data.find(d => d.session === s && d.room === room);
        if (dbSlot) {
          slots.push({
            day,
            session: s as SessionNumber,
            room,
            courseName: dbSlot.courseName,
            status: dbSlot.courseName.toLowerCase().includes('dipinjam') || dbSlot.courseName.toLowerCase().includes('digunakan') ? 'borrowed' : 'scheduled'
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
    
    await prisma.booking.deleteMany({
      where: {
        createdAt: { lt: d }
      }
    });
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
    const existing = await prisma.officialSchedule.findFirst({
      where: { day, session, room }
    });

    if (existing) {
      return { success: false, message: 'Slot ini sudah memiliki jadwal resmi. Gunakan fitur edit untuk mengubahnya.' };
    }

    await prisma.officialSchedule.create({
      data: {
        day,
        session,
        room,
        courseName: courseName.trim()
      }
    });

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

    const updated = await prisma.officialSchedule.updateMany({
      where: { day, session, room },
      data: { courseName: newCourseName.trim() }
    });

    if (updated.count === 0) {
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

    const deleted = await prisma.officialSchedule.deleteMany({
      where: { day, session, room }
    });

    if (deleted.count === 0) {
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
  type: AnnouncementType | string;
  isActive: boolean;
  expiresAt: string | Date;
  createdAt: string | Date;
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

    const data = await prisma.announcement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type,
        isActive: true,
        expiresAt
      }
    });

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

    await prisma.announcement.delete({ where: { id } });

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

    await prisma.announcement.update({
      where: { id },
      data: { isActive }
    });

    revalidatePath('/');
    return { success: true, message: isActive ? 'Pengumuman diaktifkan.' : 'Pengumuman dinonaktifkan.' };
  } catch (error: any) {
    console.error('toggleAnnouncementActive error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal mengubah status pengumuman.' };
  }
}

export async function fetchActiveAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    const data = await prisma.announcement.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, message: 'OK', data: data || [] };
  } catch (error) {
    console.error('fetchActiveAnnouncements error:', error);
    return { success: false, message: 'Gagal memuat pengumuman.', data: [] };
  }
}

export async function fetchAllAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    await requireAdmin();

    const data = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, message: 'OK', data: data || [] };
  } catch (error: any) {
    console.error('fetchAllAnnouncements error:', error);
    return { success: false, message: error.message === 'Unauthorized: Admin authentication required.' ? error.message : 'Gagal memuat pengumuman.', data: [] };
  }
}
