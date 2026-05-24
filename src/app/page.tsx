'use client';

import { useState } from 'react';
import { Day, SessionNumber, RoomName } from '@/lib/types';
import DaySelector from '@/components/DaySelector';
import ScheduleTable, { SlotDisplayData } from '@/components/ScheduleTable';
import BookingModal from '@/components/BookingModal';

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<Day>('Senin');
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{
    day: Day;
    session: SessionNumber;
    room: RoomName;
    maxDuration: number;
  } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSlotClick = (
    day: Day,
    session: SessionNumber,
    room: RoomName,
    maxDuration: number,
    data: SlotDisplayData
  ) => {
    setBookingData({ day, session, room, maxDuration });
    setModalOpen(true);
  };

  const handleBookingSuccess = () => {
    setModalOpen(false);
    setRefreshKey((k) => k + 1);
    showToast('Permintaan peminjaman berhasil dikirim. Silakan cek status di tab Cek Status.', 'success');
  };

  return (
    <div className="max-w-[1480px] mx-auto px-6 lg:px-8 py-8 md:py-12">
      {toast && (
        <div className={`fixed top-24 right-6 z-[2000] px-6 py-4 rounded-xl text-[14px] font-semibold shadow-xl flex items-center gap-3 transition-all duration-300 animate-[slideInRight_400ms_ease-out] ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 
          toast.type === 'error' ? 'bg-rose-600 text-white' : 
          'bg-sky-600 text-white'
        }`}>
          <span>{toast.msg}</span>
          <button className="opacity-70 hover:opacity-100 transition-opacity ml-2 text-lg leading-none" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="mb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00a2e9]/10 border border-[#00a2e9]/20 text-[11px] font-bold text-[#00a2e9] uppercase tracking-wider mb-5">
          <span className="w-2 h-2 rounded-full bg-[#00a2e9] animate-pulse"></span>
          Sistem Informasi Ruangan
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4 leading-tight">
          Jadwal Penggunaan<br />
          <span className="text-[#00a2e9]">Ruangan Kuliah.</span>
        </h1>
        <p className="text-[15px] text-slate-500 leading-relaxed md:text-lg font-medium">
          Lihat jadwal penggunaan ruangan dan ajukan peminjaman dengan mengklik slot yang berstatus <span className="inline-flex items-center font-bold text-[#00a2e9] bg-[#00a2e9]/10 border border-[#00a2e9]/20 px-2 py-0.5 rounded-md text-[13px] tracking-wide ml-1">Tersedia</span> pada tabel.
        </p>
      </div>

      <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      
      <div className="mt-8">
        <ScheduleTable 
          selectedDay={selectedDay} 
          onSlotClick={handleSlotClick} 
          refreshKey={refreshKey} 
        />
      </div>

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
