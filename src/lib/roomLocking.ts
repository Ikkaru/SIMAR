import { prisma } from './prisma';
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
  type: 'day' | 'week' | 'permanent' | 'custom',
  dates: string[],
  note?: string
): Promise<boolean> {
  try {
    // Hapus semua kunci yang ada untuk ruangan ini terlebih dahulu agar tidak double
    await unlockRoomFull(room);

    let payload: any[] = [];

    if (type === 'permanent') {
      payload.push({
        room,
        isPermanent: true,
        lockedDate: null,
        note: note || null
      });
    } else {
      // Untuk 'day' dan 'week', kita insert setiap tanggal
      payload = dates.map(d => ({
        room,
        isPermanent: false,
        lockedDate: d,
        note: note || null
      }));
    }

    await prisma.lockedRoom.createMany({ data: payload });
    return true;
  } catch (error) {
    console.error('Error locking room:', error);
    return false;
  }
}

/**
 * Membuka kunci seluruh ruangan
 */
export async function unlockRoomFull(room: RoomName): Promise<boolean> {
  try {
    await prisma.lockedRoom.deleteMany({ where: { room } });
    return true;
  } catch (error) {
    console.error('Error unlocking room:', error);
    return false;
  }
}

/**
 * Mengambil semua data ruangan yang terkunci pada tanggal tertentu atau secara permanen
 */
export async function getLockedRoomsForDate(dateStr: string): Promise<LockedRoom[]> {
  try {
    const data = await prisma.lockedRoom.findMany({
      where: {
        OR: [
          { lockedDate: dateStr },
          { isPermanent: true }
        ]
      }
    });
    
    return data.map(d => ({
      id: d.id,
      room: d.room as RoomName,
      locked_date: d.lockedDate,
      is_permanent: d.isPermanent,
      note: d.note
    }));
  } catch (error) {
    console.error('Error fetching locked rooms:', error);
    return [];
  }
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
