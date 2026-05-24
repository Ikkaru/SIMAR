import { supabase } from './supabase';
import { RoomName } from './types';

export interface LockedRoom {
  id: string;
  room: RoomName;
  locked_date: string | null;
  is_permanent: boolean;
  note: string | null;
}

/**
 * Mengunci ruangan secara penuh
 * @param room Nama ruangan
 * @param type 'day' | 'week' | 'permanent'
 * @param dates Array tanggal dengan format YYYY-MM-DD
 * @param note Alasan kunci
 */
export async function lockRoomFull(
  room: RoomName,
  type: 'day' | 'week' | 'permanent',
  dates: string[],
  note?: string
): Promise<boolean> {
  // Hapus semua kunci yang ada untuk ruangan ini terlebih dahulu agar tidak double
  await unlockRoomFull(room);

  let payload: any[] = [];

  if (type === 'permanent') {
    payload.push({
      room,
      is_permanent: true,
      locked_date: null,
      note: note || null
    });
  } else {
    // Untuk 'day' dan 'week', kita insert setiap tanggal
    payload = dates.map(d => ({
      room,
      is_permanent: false,
      locked_date: d,
      note: note || null
    }));
  }

  const { error } = await supabase.from('locked_rooms').insert(payload);
  
  if (error) {
    console.error('Error locking room:', error);
    return false;
  }
  return true;
}

/**
 * Membuka kunci seluruh ruangan
 */
export async function unlockRoomFull(room: RoomName): Promise<boolean> {
  const { error } = await supabase.from('locked_rooms').delete().eq('room', room);
  if (error) {
    console.error('Error unlocking room:', error);
    return false;
  }
  return true;
}

/**
 * Mengambil semua data ruangan yang terkunci pada tanggal tertentu atau secara permanen
 */
export async function getLockedRoomsForDate(dateStr: string): Promise<LockedRoom[]> {
  const { data, error } = await supabase
    .from('locked_rooms')
    .select('*')
    .or(`locked_date.eq.${dateStr},is_permanent.eq.true`);
    
  if (error || !data) return [];
  return data as LockedRoom[];
}

/**
 * Helper: format Date object to YYYY-MM-DD
 */
export function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
