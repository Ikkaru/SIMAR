import { BookingRequest, BookingStatus, Day, SessionNumber, RoomName, ROOM_LIST } from './types';
import { supabase } from './supabase';

export interface LockedSlot {
  id?: string;
  day: Day;
  session: SessionNumber;
  room: RoomName;
  note?: string;
}

function generateId(): string {
  return `BKG-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
}

// ─── Booking CRUD ────────────────────────────────────────────

export async function addBooking(
  data: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>
): Promise<BookingRequest | null> {
  const booking = {
    ...data,
    id: generateId(),
    status: 'pending',
  };

  const { data: inserted, error } = await supabase
    .from('bookings')
    .insert([booking])
    .select()
    .single();

  if (error) {
    console.error('Error adding booking:', error);
    return null;
  }
  return inserted as BookingRequest;
}

export async function getAllBookings(): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) return [];
  return data as BookingRequest[];
}

export async function getBookingsByStatus(status: BookingStatus): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', status)
    .order('createdAt', { ascending: false });
  if (error) return [];
  return data as BookingRequest[];
}

export async function getBookingsForSlot(
  day: Day, session: SessionNumber, room: RoomName
): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('day', day)
    .eq('room', room)
    .neq('status', 'rejected');

  if (error || !data) return [];

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
  const updates: any = { status, reviewedAt: new Date().toISOString() };
  if (note) updates.reviewNote = note;

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data as BookingRequest;
}

export async function getBookingById(id: string): Promise<BookingRequest | null> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) return null;
  return data as BookingRequest;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  return !error;
}

export async function editBooking(
  id: string,
  updates: Partial<Pick<BookingRequest, 'namaPJ' | 'namaMatakuliah' | 'dosenPengampu' | 'durasiPemakaian'>>
): Promise<BookingRequest | null> {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data as BookingRequest;
}

export async function getBookingStats(): Promise<{
  total: number; pending: number; approved: number; rejected: number;
}> {
  const { data, error } = await supabase.from('bookings').select('status');
  if (error || !data) return { total: 0, pending: 0, approved: 0, rejected: 0 };

  return {
    total: data.length,
    pending: data.filter((b) => b.status === 'pending').length,
    approved: data.filter((b) => b.status === 'approved').length,
    rejected: data.filter((b) => b.status === 'rejected').length,
  };
}

// ─── Lock System ─────────────────────────────────────────────

export async function isSlotLocked(
  day: Day, session: SessionNumber, room: RoomName
): Promise<LockedSlot | undefined> {
  const { data, error } = await supabase
    .from('locked_slots')
    .select('*')
    .eq('day', day)
    .eq('session', session)
    .eq('room', room)
    .maybeSingle();
  if (error || !data) return undefined;
  return data as LockedSlot;
}

export async function lockSlot(day: Day, session: SessionNumber, room: RoomName, note?: string) {
  await supabase.from('locked_slots').delete().match({ day, session, room });
  await supabase.from('locked_slots').insert([{ day, session, room, note }]);
}

export async function unlockSlot(day: Day, session: SessionNumber, room: RoomName) {
  await supabase.from('locked_slots').delete().match({ day, session, room });
}

export async function getAllLockedSlots(): Promise<LockedSlot[]> {
  const { data, error } = await supabase.from('locked_slots').select('*');
  if (error) return [];
  return data as LockedSlot[];
}

export async function getRoomUsageStats(): Promise<{ room: RoomName; bookedCount: number; approvedCount: number }[]> {
  const { data, error } = await supabase.from('bookings').select('room, status').neq('status', 'rejected');
  if (error || !data) return ROOM_LIST.map((room) => ({ room, bookedCount: 0, approvedCount: 0 }));

  return ROOM_LIST.map((room) => ({
    room,
    bookedCount: data.filter((b) => b.room === room).length,
    approvedCount: data.filter((b) => b.room === room && b.status === 'approved').length,
  })).sort((a, b) => b.approvedCount - a.approvedCount);
}
