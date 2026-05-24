'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Day, SessionNumber, RoomName, ROOM_LIST, ScheduleSlot, BookingRequest, getSessionTimes, isDayPast, getWeekDates
} from '@/lib/types';
import { getScheduleForDay } from '@/lib/scheduleData';
import { fetchDayOverrides, fetchLockedRoomsForDate } from '@/lib/actions';
import { LockedRoom } from '@/lib/roomLocking';

export interface SlotDisplayData {
  status: 'scheduled' | 'borrowed' | 'available' | 'pending' | 'approved' | 'locked';
  courseName: string;
  booking?: BookingRequest;
}

interface ScheduleTableProps {
  selectedDay: Day;
  onSlotClick?: (day: Day, session: SessionNumber, room: RoomName, maxDuration: number, data: SlotDisplayData) => void;
  onRoomHeaderClick?: (room: RoomName, isLocked: boolean, currentNote: string) => void;
  refreshKey?: number;
  adminMode?: boolean;
}

export default function ScheduleTable({
  selectedDay, onSlotClick, onRoomHeaderClick, refreshKey = 0, adminMode = false
}: ScheduleTableProps) {
  const [slotOverrides, setSlotOverrides] = useState<Record<string, SlotDisplayData>>({});
  const [lockedRooms, setLockedRooms] = useState<LockedRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPast, setIsPast] = useState(false);

  const sessionTimes = getSessionTimes(selectedDay);
  const baseSlots = getScheduleForDay(selectedDay);
  
  const dates = useMemo(() => getWeekDates(), []);
  const currentDateStr = dates[selectedDay]?.dateObj.toISOString().split('T')[0];

  const baseSlotMap = new Map<string, ScheduleSlot>();
  baseSlots.forEach((slot) => {
    baseSlotMap.set(`${slot.day}-${slot.session}-${slot.room}`, slot);
  });

  const fetchOverridesAndLocks = useCallback(async () => {
    if (!currentDateStr) return;
    setIsLoading(true);
    
    const [overridesRes, locksRes] = await Promise.all([
      fetchDayOverrides(selectedDay),
      fetchLockedRoomsForDate(currentDateStr)
    ]);
    
    if (overridesRes.success && overridesRes.data) {
      setSlotOverrides(overridesRes.data);
    }
    if (locksRes.success && locksRes.data) {
      setLockedRooms(locksRes.data);
    }
    
    setIsLoading(false);
  }, [selectedDay, refreshKey, currentDateStr]);

  useEffect(() => {
    fetchOverridesAndLocks();
    setIsPast(isDayPast(selectedDay));
  }, [fetchOverridesAndLocks, selectedDay]);

  function getSlotDisplay(session: SessionNumber, room: RoomName): SlotDisplayData {
    const key = `${selectedDay}-${session}-${room}`;
    if (slotOverrides[key]) return slotOverrides[key];
    const baseSlot = baseSlotMap.get(key);
    if (baseSlot) {
      return { status: baseSlot.status as SlotDisplayData['status'], courseName: baseSlot.courseName };
    }
    return { status: 'available', courseName: '' };
  }

  function getMaxDuration(startSession: SessionNumber, room: RoomName): number {
    let count = 0;
    for (let s = startSession; s <= 11; s++) {
      const display = getSlotDisplay(s as SessionNumber, room);
      if (display.status === 'available') {
        count++;
        if (count === 6) break;
      } else {
        break;
      }
    }
    return Math.max(count, 1);
  }

  function getRoomLock(room: RoomName): LockedRoom | undefined {
    return lockedRooms.find(r => r.room === room);
  }

  function handleSlotClick(session: SessionNumber, room: RoomName, displayData: SlotDisplayData) {
    if (getRoomLock(room)) return; // Don't allow click if room is fully locked

    if (adminMode && onSlotClick) {
      onSlotClick(selectedDay, session, room, 0, displayData);
    } else if (displayData.status === 'available' && onSlotClick && !isPast) {
      const maxDur = getMaxDuration(session, room);
      onSlotClick(selectedDay, session, room, maxDur, displayData);
    }
  }

  function renderSlotCell(session: SessionNumber, room: RoomName) {
    const roomLock = getRoomLock(room);

    if (roomLock) {
      if (session === 1) {
        return (
          <td key={room} rowSpan={11} className="p-0 align-middle">
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-4 text-center bg-slate-100/60 border border-slate-200 m-1.5 rounded-[1.25rem] shadow-inner overflow-hidden relative group">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-4xl mb-2 text-slate-400 group-hover:scale-110 transition-transform">🔒</span>
                {roomLock.note && (
                  <div className="px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/60 mt-1 max-w-[120px] shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 line-clamp-3 leading-snug">{roomLock.note}</span>
                  </div>
                )}
              </div>
            </div>
          </td>
        );
      } else {
        return null;
      }
    }

    const display = getSlotDisplay(session, room);
    
    // Bento-box style inside the flat table grid
    const baseCell = "flex flex-col items-center justify-center h-full min-h-[80px] p-3 text-[11px] leading-[1.4] text-center transition-all duration-300 ease-out relative break-words rounded-[1.25rem] border mx-1.5 my-1.5";

    if (display.status === 'available') {
      if (isPast && !adminMode) {
        return (
          <td key={room} className="p-0 align-middle">
            <div className={`${baseCell} bg-slate-100/50 border-slate-200 cursor-not-allowed`}>
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <span className="w-6 h-6 rounded-[8px] bg-slate-200/50 border border-slate-200 shadow-none flex items-center justify-center text-[16px] font-light">-</span>
                <span className="tracking-widest uppercase text-[9px] font-bold opacity-60">Lewat</span>
              </div>
            </div>
          </td>
        );
      }

      return (
        <td key={room} className="p-0 align-middle">
          <div
            className={`${baseCell} bg-sky-50/30 border-sky-100 hover:bg-white hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,162,233,0.12)] hover:border-[#00a2e9]/30 cursor-pointer group`}
            onClick={() => handleSlotClick(session, room, display)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSlotClick(session, room, display); }}
          >
            <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-[#00a2e9]">
              <span className="w-6 h-6 rounded-[8px] bg-white border border-sky-100 shadow-sm flex items-center justify-center text-[16px] font-light group-hover:bg-[#00a2e9] group-hover:border-[#00a2e9] group-hover:text-white group-hover:shadow-[#00a2e9]/30 transition-all duration-300 transform group-hover:scale-110">+</span>
              <span className="tracking-widest uppercase text-[9px] font-bold opacity-80 group-hover:opacity-100">Tersedia</span>
            </div>
          </div>
        </td>
      );
    }

    // Style map for occupied states with organic vibe
    const styleMap = {
      scheduled: 'bg-white border-slate-200/80 text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.02)]',
      borrowed: 'bg-white border-slate-200/80 text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.02)]',
      pending: 'bg-amber-50/50 border-amber-200 text-amber-900 shadow-sm',
      approved: 'bg-emerald-50/50 border-emerald-200 text-emerald-900 shadow-sm',
      locked: 'bg-slate-50 border-slate-200 text-slate-400 shadow-none'
    };

    return (
      <td key={room} className="p-0 align-middle">
        <div 
          className={`${baseCell} ${styleMap[display.status]} ${adminMode ? 'cursor-pointer hover:shadow-lg hover:shadow-[#00a2e9]/10 hover:-translate-y-0.5 hover:border-[#00a2e9]/30' : ''}`}
          onClick={() => handleSlotClick(session, room, display)}
          role={adminMode ? "button" : undefined}
          tabIndex={adminMode ? 0 : undefined}
        >
          <span className="font-bold line-clamp-3 leading-snug">{display.courseName}</span>
          
          {display.status === 'pending' && <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">⏳ Pending</span>}
          {display.status === 'approved' && <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">✓ Dipinjam</span>}
          {display.status === 'locked' && <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500">🔒 Dikunci</span>}
        </div>
      </td>
    );
  }

  return (
    <div className="bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden p-6 md:p-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00a2e9]/10 to-white flex items-center justify-center text-[#00a2e9] shadow-sm border border-[#00a2e9]/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              Jadwal Kelas
              {isLoading && <span className="w-4 h-4 rounded-full border-[2.5px] border-slate-100 border-t-[#00a2e9] animate-spin" />}
            </h2>
            <span className="text-[13px] font-bold text-[#00a2e9] uppercase tracking-wider mt-0.5">Hari {selectedDay}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hidden md:inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00a2e9] animate-pulse" />
          {adminMode ? 'Mode Admin: Inspeksi Aktif' : 'Pilih slot tersedia pada tabel untuk booking'}
        </span>
      </div>

      {/* Modern Spreadsheet Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm custom-scrollbar">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 top-0 z-20 bg-slate-50 text-slate-500 px-4 py-3.5 text-[11px] font-bold tracking-widest uppercase border-r border-slate-200 w-[100px]">
                Waktu
              </th>
              {ROOM_LIST.map((room) => {
                const roomLock = getRoomLock(room);
                return (
                  <th 
                    key={room} 
                    className={`sticky top-0 z-10 bg-slate-50 text-slate-700 px-4 py-3.5 text-[12px] font-bold tracking-wider uppercase border-r border-slate-100 last:border-r-0 ${adminMode ? 'cursor-pointer hover:bg-slate-200 transition-colors' : ''}`}
                    onClick={() => adminMode && onRoomHeaderClick && onRoomHeaderClick(room, !!roomLock, roomLock?.note || '')}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <div className="flex items-center gap-1.5">
                        {roomLock && <span className="text-amber-500" title="Dikunci">🔒</span>}
                        {room}
                      </div>
                      {adminMode && <span className="text-[9px] text-sky-500 lowercase opacity-0 hover:opacity-100 absolute bottom-0 font-medium tracking-normal mb-1">klik untuk kunci</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sessionTimes.map((st, i) => (
              <tr key={st.sesi} className={i !== sessionTimes.length - 1 ? "border-b border-slate-100" : ""}>
                <td className="sticky left-0 z-10 bg-white border-r border-slate-200 w-[100px] align-middle p-0">
                  <div className="flex flex-col items-center justify-center py-4">
                    <span className="text-[14px] font-bold text-slate-700">Sesi {st.sesi}</span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{st.jamMulai} - {st.jamAkhir}</span>
                  </div>
                </td>
                {ROOM_LIST.map((room) => renderSlotCell(st.sesi, room))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Legend */}
      <div className="mt-6 flex flex-wrap gap-3 items-center text-[11px] font-bold text-slate-500 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <span className="text-slate-400 uppercase tracking-widest mr-2 text-[10px]">Indikator:</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#00a2e9]/20 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-[#00a2e9]" />Tersedia</div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" />Jadwal Resmi</div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" />Menunggu Persetujuan</div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-200"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Dipinjam</div>
      </div>
    </div>
  );
}
