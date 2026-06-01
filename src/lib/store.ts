import { BookingRequest, BookingStatus, Day, SessionNumber, RoomName, ROOM_LIST } from './types';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export interface LockedSlot {
  id?: string;
  day: Day;
  session: SessionNumber;
  room: RoomName;
  note?: string;
}

function generateId(): string {
  return `BKG-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
}

// ─── Booking CRUD ────────────────────────────────────────────

export async function addBooking(
  data: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>
): Promise<BookingRequest | null> {
  const newId = generateId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire advisory lock based on day and room string hash
      const lockKeyStr = `${data.day}-${data.room}`;
      let hash = 0;
      for (let i = 0; i < lockKeyStr.length; i++) {
        hash = Math.imul(31, hash) + lockKeyStr.charCodeAt(i) | 0;
      }
      
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash})`;

      // 2. Check for conflicts
      const conflicts = await tx.booking.count({
        where: {
          day: data.day,
          room: data.room,
          status: { in: ['pending', 'approved'] },
          AND: [
            { session: { lte: data.session + data.durasiPemakaian - 1 } },
            // Prisma doesn't have a direct way to do `session + durasiPemakaian - 1 >= data.session` in query syntax without raw
            // So we use raw query for conflict checking to be perfectly equivalent
          ]
        }
      });
      
      // Let's use raw query for perfect match with old logic
      const rawConflicts = await tx.$queryRaw<{count: bigint}[]>`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE day = ${data.day}
          AND room = ${data.room}
          AND status IN ('pending', 'approved')
          AND (session <= ${data.session + data.durasiPemakaian - 1})
          AND (session + "durasiPemakaian" - 1 >= ${data.session})
      `;
      
      if (Number(rawConflicts[0].count) > 0) {
        throw new Error('Slot sudah terisi oleh booking lain.');
      }

      // 3. Insert new booking
      const booking = await tx.booking.create({
        data: {
          id: newId,
          day: data.day,
          session: data.session,
          room: data.room,
          durasiPemakaian: data.durasiPemakaian,
          namaPJ: data.namaPJ,
          nim: data.nim,
          namaMatakuliah: data.namaMatakuliah,
          dosenPengampu: data.dosenPengampu,
          status: 'pending'
        }
      });

      return booking;
    });

    return result as BookingRequest;
  } catch (error) {
    console.error('Error adding booking via Prisma transaction:', error);
    return null;
  }
}

export async function getAllBookings(): Promise<BookingRequest[]> {
  const data = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return data as BookingRequest[];
}

export async function getBookingsByStatus(status: BookingStatus): Promise<BookingRequest[]> {
  const data = await prisma.booking.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' }
  });
  return data as BookingRequest[];
}

export async function getBookingsForSlot(
  day: Day, session: SessionNumber, room: RoomName
): Promise<BookingRequest[]> {
  const data = await prisma.booking.findMany({
    where: {
      day,
      room,
      status: { not: 'rejected' }
    }
  });

  return (data as BookingRequest[]).filter(
    (b) => session >= b.session && session < b.session + b.durasiPemakaian
  );
}

export async function isSlotBooked(
  day: Day, session: SessionNumber, room: RoomName
): Promise<{ isPending: boolean; isApproved: boolean }> {
  const slotBookings = await getBookingsForSlot(day, session, room);
  return {
    isPending: slotBookings.some((b) => b.status === 'pending'),
    isApproved: slotBookings.some((b) => b.status === 'approved'),
  };
}

export async function updateBookingStatus(
  id: string, status: 'approved' | 'rejected', note?: string
): Promise<BookingRequest | null> {
  try {
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewNote: note
      }
    });
    return updated as BookingRequest;
  } catch (e) {
    return null;
  }
}

export async function getBookingById(id: string): Promise<BookingRequest | null> {
  const data = await prisma.booking.findUnique({ where: { id } });
  return data as BookingRequest | null;
}

export async function deleteBooking(id: string): Promise<boolean> {
  try {
    await prisma.booking.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearResolvedBookings(): Promise<boolean> {
  try {
    await prisma.booking.deleteMany({
      where: { status: { in: ['approved', 'rejected'] } }
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function editBooking(
  id: string,
  updates: Partial<Pick<BookingRequest, 'namaPJ' | 'namaMatakuliah' | 'dosenPengampu' | 'durasiPemakaian'>>
): Promise<BookingRequest | null> {
  try {
    const updated = await prisma.booking.update({
      where: { id },
      data: updates
    });
    return updated as BookingRequest;
  } catch (e) {
    return null;
  }
}

export async function deleteAllBookings(): Promise<boolean> {
  try {
    await prisma.booking.deleteMany({});
    return true;
  } catch (e) {
    return false;
  }
}

export async function getBookingStats(): Promise<{
  total: number; pending: number; approved: number; rejected: number;
}> {
  const groups = await prisma.booking.groupBy({
    by: ['status'],
    _count: true
  });
  
  const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
  groups.forEach(g => {
    stats.total += g._count;
    if (g.status === 'pending') stats.pending = g._count;
    if (g.status === 'approved') stats.approved = g._count;
    if (g.status === 'rejected') stats.rejected = g._count;
  });
  
  return stats;
}

// ─── Lock System ─────────────────────────────────────────────

export async function isSlotLocked(
  day: Day, session: SessionNumber, room: RoomName
): Promise<LockedSlot | undefined> {
  const data = await prisma.lockedSlot.findFirst({
    where: { day, session, room }
  });
  return (data as LockedSlot) || undefined;
}

export async function lockSlot(day: Day, session: SessionNumber, room: RoomName, note?: string) {
  await prisma.$transaction([
    prisma.lockedSlot.deleteMany({ where: { day, session, room } }),
    prisma.lockedSlot.create({ data: { day, session, room, note: note || '' } })
  ]);
}

export async function unlockSlot(day: Day, session: SessionNumber, room: RoomName) {
  await prisma.lockedSlot.deleteMany({ where: { day, session, room } });
}

export async function getAllLockedSlots(): Promise<LockedSlot[]> {
  const data = await prisma.lockedSlot.findMany();
  return data as LockedSlot[];
}

export async function getRoomUsageStats(): Promise<{ room: RoomName; bookedCount: number; approvedCount: number }[]> {
  const data = await prisma.booking.findMany({
    where: { status: { not: 'rejected' } },
    select: { room: true, status: true }
  });
  
  return ROOM_LIST.map((room) => ({
    room,
    bookedCount: data.filter((b) => b.room === room).length,
    approvedCount: data.filter((b) => b.room === room && b.status === 'approved').length,
  })).sort((a, b) => b.approvedCount - a.approvedCount);
}

// ─── Privacy-safe Search ─────────────────────────────────────

export async function searchBookingsByNimOrId(
  query: string
): Promise<BookingRequest[]> {
  const data = await prisma.booking.findMany({
    where: {
      OR: [
        { id: { contains: query, mode: 'insensitive' } },
        { nim: { contains: query, mode: 'insensitive' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  return data as BookingRequest[];
}
