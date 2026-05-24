'use client';

import { useState, useEffect, useMemo } from 'react';
import { Day, SessionNumber, RoomName, DAYS } from '@/lib/types';
import { getAvailableRoomsSummary } from '@/lib/actions';
import BookingModal from '@/components/BookingModal';
import DaySelector from '@/components/DaySelector';

type AvailableData = Record<Day, { session: SessionNumber; room: RoomName; time: string }[]>;

export default function AvailableRoomsPage() {
  const [data, setData] = useState<AvailableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDay, setSelectedDay] = useState<Day>('Senin');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{
    day: Day;
    session: SessionNumber;
    room: RoomName;
    maxDuration: number;
  } | null>(null);

  const load = async () => {
    setIsLoading(true);
    const res = await getAvailableRoomsSummary();
    if (res.success && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleBookingSuccess = () => {
    setModalOpen(false);
    load(); // Reload data to reflect the newly booked slot
    showToast('Permintaan peminjaman berhasil dikirim. Silakan cek status di tab Cek Status.', 'success');
  };

  const handleBookingClick = (room: RoomName, startSession: number, maxDuration: number) => {
    setBookingData({
      day: selectedDay,
      session: startSession as SessionNumber,
      room,
      maxDuration
    });
    setModalOpen(true);
  };

  // Group consecutive sessions for the selected day
  const groupedCards = useMemo(() => {
    if (!data) return [];
    
    const slots = data[selectedDay];
    if (!slots || slots.length === 0) return [];

    // Group by room
    const roomMap: Record<string, typeof slots> = {};
    slots.forEach(slot => {
      if (!roomMap[slot.room]) roomMap[slot.room] = [];
      roomMap[slot.room].push(slot);
    });

    const cards: { room: RoomName; startSesi: number; endSesi: number; maxDuration: number }[] = [];

    // Find consecutive sequences
    Object.entries(roomMap).forEach(([room, roomSlots]) => {
      roomSlots.sort((a, b) => a.session - b.session);
      
      let currentGroup = [roomSlots[0]];
      
      for (let i = 1; i < roomSlots.length; i++) {
        if (roomSlots[i].session === currentGroup[currentGroup.length - 1].session + 1) {
          currentGroup.push(roomSlots[i]);
        } else {
          cards.push({
            room: room as RoomName,
            startSesi: currentGroup[0].session,
            endSesi: currentGroup[currentGroup.length - 1].session,
            maxDuration: currentGroup.length
          });
          currentGroup = [roomSlots[i]];
        }
      }
      
      if (currentGroup.length > 0) {
        cards.push({
          room: room as RoomName,
          startSesi: currentGroup[0].session,
          endSesi: currentGroup[currentGroup.length - 1].session,
          maxDuration: currentGroup.length
        });
      }
    });

    // Sort cards by starting session, then by room name
    cards.sort((a, b) => {
      if (a.startSesi !== b.startSesi) return a.startSesi - b.startSesi;
      return a.room.localeCompare(b.room);
    });

    return cards;
  }, [data, selectedDay]);

  // Determine number of columns based on screen size (we'll handle it via CSS classes, but for masonry we must group in JS)
  // To avoid hydration mismatch, we group them into 4 logical columns and use responsive hidden classes, 
  // OR we can just use CSS columns! CSS columns is much easier for responsive masonry.
  // Wait, if we use CSS columns, we can't easily offset the whole 2nd and 4th column.
  // Let's use a Flex row where columns are visible based on media queries.

  return (
    <div className="max-w-[1480px] mx-auto px-6 lg:px-8 py-10 md:py-16 font-sans">
      {toast && (
        <div className={`fixed top-24 right-6 z-[2000] px-6 py-4 rounded-2xl text-[14px] font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 transition-all duration-300 animate-[slideInRight_400ms_ease-out] border border-white/20 backdrop-blur-md ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 
          toast.type === 'error' ? 'bg-rose-500 text-white' : 
          'bg-[#00a2e9] text-white'
        }`}>
          <span>{toast.msg}</span>
          <button className="opacity-70 hover:opacity-100 transition-opacity ml-2 text-lg leading-none" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="mb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00a2e9]/10 border border-[#00a2e9]/20 text-[11px] font-bold text-[#00a2e9] uppercase tracking-wider mb-5">
          <span className="w-2 h-2 rounded-full bg-[#00a2e9] animate-pulse"></span>
          Advance Booking
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4 leading-tight">
          Temukan Ruangan<br />
          <span className="text-[#00a2e9]">Kosong & Tersedia.</span>
        </h1>
        <p className="text-[15px] text-slate-500 leading-relaxed md:text-lg font-medium">
          Daftar seluruh ruangan yang berstatus tersedia untuk 5 hari kedepan. Pilih hari dan jadwalkan peminjaman Anda dari jauh hari.
        </p>
      </div>

      <div className="mb-12">
        <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/40 rounded-[2.5rem] p-8 h-[240px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] animate-pulse flex flex-col justify-between border border-slate-100/50">
               <div className="w-14 h-14 bg-slate-100 rounded-3xl mb-4"></div>
               <div className="h-6 bg-slate-100 rounded w-1/2 mb-2"></div>
               <div className="h-4 bg-slate-50 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : groupedCards.length > 0 ? (
        <div className="w-full">
          {/* Staggered Masonry Layout using CSS Columns */}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 lg:gap-8 space-y-6 lg:space-y-8 pb-16">
            {groupedCards.map((card, idx) => (
              <div 
                key={idx} 
                className={`break-inside-avoid bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100/60 hover:shadow-[0_20px_40px_rgba(0,162,233,0.08)] hover:-translate-y-2 hover:border-[#00a2e9]/30 transition-all duration-500 group flex flex-col justify-between relative overflow-hidden
                ${idx % 2 === 1 ? 'md:mt-12 lg:mt-16' : ''} ${idx % 3 === 2 ? 'lg:mt-24' : ''}
                `}
              >
                {/* Subtle organic background blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#00a2e9]/10 to-transparent rounded-bl-[4rem] opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out transform group-hover:scale-125"></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-[#00a2e9] group-hover:text-white group-hover:shadow-xl group-hover:shadow-[#00a2e9]/30 transition-all duration-500">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <h3 className="text-[26px] font-black text-slate-800 tracking-tight mb-3 group-hover:text-[#00a2e9] transition-colors duration-300">
                    {card.room}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mb-8">
                     <span className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[12px] font-bold text-slate-500 uppercase tracking-wider group-hover:bg-[#00a2e9]/10 group-hover:text-[#00a2e9] group-hover:border-[#00a2e9]/20 transition-colors duration-300">
                       Sesi {card.startSesi}{card.endSesi !== card.startSesi ? ` – ${card.endSesi}` : ''}
                     </span>
                  </div>
                </div>

                <div className="relative z-10 pt-5 border-t border-slate-100 flex justify-end">
                  <button 
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-[14px] bg-slate-50 text-slate-600 transition-all duration-300 group-hover:bg-[#00a2e9] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#00a2e9]/25 active:scale-95 group/btn"
                    onClick={() => handleBookingClick(card.room, card.startSesi, card.maxDuration)}
                  >
                    Booking
                    <svg className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center justify-center p-16 md:p-24 text-center mt-8">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-5xl mb-6 shadow-sm">
            🏖️
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3">Semua Ruangan Penuh</h3>
          <p className="text-slate-500 font-medium max-w-md text-[15px] leading-relaxed">
            Wah, sepertinya seluruh ruangan penuh pada hari <span className="text-[#00a2e9] font-bold">{selectedDay}</span>. Silakan pilih hari lain atau jadwalkan di minggu berikutnya.
          </p>
        </div>
      )}

      {bookingData && (
        <BookingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          day={bookingData.day}
          session={bookingData.session}
          room={bookingData.room}
          maxDuration={bookingData.maxDuration}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
