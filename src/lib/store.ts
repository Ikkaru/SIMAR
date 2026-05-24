// ============================================================
// SIMAR V3 — Server-side In-Memory Store
// ============================================================

import { BookingRequest, BookingStatus, Day, SessionNumber, RoomName, ROOM_LIST, DAYS } from './types';

export interface LockedSlot {
  day: Day;
  session: SessionNumber;
  room: RoomName;
  note?: string;
}

const globalStore = globalThis as unknown as {
  __SIMAR_BOOKINGS: BookingRequest[];
  __SIMAR_NEXT_ID: number;
  __SIMAR_LOCKED_SLOTS: LockedSlot[];
};

if (!globalStore.__SIMAR_BOOKINGS) {
  globalStore.__SIMAR_BOOKINGS = [];
  globalStore.__SIMAR_NEXT_ID = 1;
  globalStore.__SIMAR_LOCKED_SLOTS = [];
}

const bookings = globalStore.__SIMAR_BOOKINGS;
const lockedSlots = globalStore.__SIMAR_LOCKED_SLOTS;

function generateId(): string {
  return `BKG-${String(globalStore.__SIMAR_NEXT_ID++).padStart(5, '0')}`;
}

// ─── Booking CRUD ────────────────────────────────────────────

export function addBooking(
  data: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>
): BookingRequest {
  const booking: BookingRequest = {
    ...data,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

export function getAllBookings(): BookingRequest[] {
  return [...bookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getBookingsByStatus(status: BookingStatus): BookingRequest[] {
  return bookings
    .filter((b) => b.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getBookingsForSlot(
  day: Day, session: SessionNumber, room: RoomName
): BookingRequest[] {
  return bookings.filter(
    (b) =>
      b.day === day &&
      b.room === room &&
      b.status !== 'rejected' &&
      session >= b.session &&
      session < b.session + b.durasiPemakaian
  );
}

export function isSlotBooked(
  day: Day, session: SessionNumber, room: RoomName
): { isPending: boolean; isApproved: boolean } {
  const slotBookings = getBookingsForSlot(day, session, room);
  return {
    isPending: slotBookings.some((b) => b.status === 'pending'),
    isApproved: slotBookings.some((b) => b.status === 'approved'),
  };
}

export function updateBookingStatus(
  id: string, status: 'approved' | 'rejected', note?: string
): BookingRequest | null {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return null;
  booking.status = status;
  booking.reviewedAt = new Date().toISOString();
  if (note) booking.reviewNote = note;
  return booking;
}

export function getBookingById(id: string): BookingRequest | null {
  return bookings.find((b) => b.id === id) || null;
}

/** Delete a booking by ID */
export function deleteBooking(id: string): boolean {
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  bookings.splice(idx, 1);
  return true;
}

/** Edit a booking's details */
export function editBooking(
  id: string,
  updates: Partial<Pick<BookingRequest, 'namaPJ' | 'namaMatakuliah' | 'dosenPengampu' | 'durasiPemakaian'>>
): BookingRequest | null {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return null;
  if (updates.namaPJ !== undefined) booking.namaPJ = updates.namaPJ;
  if (updates.namaMatakuliah !== undefined) booking.namaMatakuliah = updates.namaMatakuliah;
  if (updates.dosenPengampu !== undefined) booking.dosenPengampu = updates.dosenPengampu;
  if (updates.durasiPemakaian !== undefined) booking.durasiPemakaian = updates.durasiPemakaian;
  return booking;
}

export function getBookingStats(): {
  total: number; pending: number; approved: number; rejected: number;
} {
  return {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    approved: bookings.filter((b) => b.status === 'approved').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
  };
}

// ─── Lock System ─────────────────────────────────────────────

export function isSlotLocked(
  day: Day, session: SessionNumber, room: RoomName
): LockedSlot | undefined {
  return globalStore.__SIMAR_LOCKED_SLOTS.find(
    (l) => l.day === day && l.session === session && l.room === room
  );
}

export function lockSlot(day: Day, session: SessionNumber, room: RoomName, note?: string) {
  globalStore.__SIMAR_LOCKED_SLOTS = globalStore.__SIMAR_LOCKED_SLOTS.filter(
    (l) => !(l.day === day && l.session === session && l.room === room)
  );
  globalStore.__SIMAR_LOCKED_SLOTS.push({ day, session, room, note });
}

export function unlockSlot(day: Day, session: SessionNumber, room: RoomName) {
  globalStore.__SIMAR_LOCKED_SLOTS = globalStore.__SIMAR_LOCKED_SLOTS.filter(
    (l) => !(l.day === day && l.session === session && l.room === room)
  );
}

export function getAllLockedSlots(): LockedSlot[] {
  return [...globalStore.__SIMAR_LOCKED_SLOTS];
}

// ─── Room Statistics (Proactive Admin Feature) ───────────────

export function getRoomUsageStats(): { room: RoomName; bookedCount: number; approvedCount: number }[] {
  return ROOM_LIST.map((room) => ({
    room,
    bookedCount: bookings.filter((b) => b.room === room && b.status !== 'rejected').length,
    approvedCount: bookings.filter((b) => b.room === room && b.status === 'approved').length,
  })).sort((a, b) => b.approvedCount - a.approvedCount);
}
