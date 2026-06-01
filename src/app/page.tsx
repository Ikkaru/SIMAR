'use client';

import { useState } from 'react';
import { Day, SessionNumber, RoomName, getSessionTimes } from '@/lib/types';
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

  // Info Modal State (for occupied slots)
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoData, setInfoData] = useState<{
    day: Day;
    session: SessionNumber;
    room: RoomName;
    data: SlotDisplayData;
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
    if (data.status === 'available') {
      // Open booking modal for available slots
      setBookingData({ day, session, room, maxDuration });
      setModalOpen(true);
    } else {
      // Open info modal for occupied slots
      setInfoData({ day, session, room, data });
      setInfoModalOpen(true);
    }
  };

  const handleBookingSuccess = () => {
    setModalOpen(false);
    setRefreshKey((k) => k + 1);
    showToast('Permintaan peminjaman berhasil dikirim. Silakan cek status di tab Cek Status.', 'success');
  };

  // Get session time for display
  const getTimeForSession = (day: Day, session: SessionNumber) => {
    const times = getSessionTimes(day);
    const st = times.find(t => t.sesi === session);
    return st ? `${st.jamMulai} – ${st.jamAkhir}` : '';
  };

  // Status display helpers
  const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
    scheduled: { label: 'Jadwal Resmi', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-200', icon: '📅' },
    borrowed: { label: 'Dipinjam Prodi Lain', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-200', icon: '📋' },
    pending: { label: 'Menunggu Persetujuan', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-200', icon: '⏳' },
    approved: { label: 'Ruangan Dipinjam', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200', icon: '✓' },
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

      {/* Info Modal for Occupied Slots */}
      {infoModalOpen && infoData && (() => {
        const cfg = statusConfig[infoData.data.status] || statusConfig.scheduled;
        const booking = infoData.data.booking;
        const isScheduled = infoData.data.status === 'scheduled' || infoData.data.status === 'borrowed';
        const isBorrowed = infoData.data.status === 'approved' || infoData.data.status === 'pending';
        
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={() => setInfoModalOpen(false)}>
            <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-900/10 w-full max-w-[480px] flex flex-col animate-[slideUp_300ms_ease-out] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              
              {/* Status Accent Bar */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                infoData.data.status === 'approved' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                infoData.data.status === 'pending' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                'bg-gradient-to-r from-slate-300 to-slate-500'
              }`} />

              {/* Header */}
              <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${cfg.bgColor} ${cfg.color} flex items-center justify-center text-2xl shadow-sm border ${cfg.borderColor}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-[20px] font-extrabold text-slate-800 tracking-tight">Informasi Slot</h2>
                    <span className={`text-[12px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md w-fit ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <button className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-rose-200" onClick={() => setInfoModalOpen(false)}>✕</button>
              </div>
              
              {/* Content */}
              <div className="p-8">
                {/* Location & Time Info */}
                <div className="flex flex-wrap gap-4 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
                  <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ruangan</span>
                    <span className="text-[15px] font-extrabold text-slate-800">{infoData.room}</span>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hari / Sesi</span>
                    <span className="text-[14px] font-bold text-slate-800">{infoData.day}, Sesi {infoData.session}</span>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Waktu</span>
                    <span className="text-[14px] font-bold text-slate-800">{getTimeForSession(infoData.day, infoData.session)}</span>
                  </div>
                </div>

                {/* Official Schedule Info */}
                {isScheduled && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/60 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      </div>
                      <h3 className="text-[14px] font-extrabold text-slate-800">Mata Kuliah</h3>
                    </div>
                    <p className="text-[15px] font-bold text-slate-700 leading-relaxed pl-11">
                      {infoData.data.courseName}
                    </p>
                    <p className="text-[12px] text-slate-400 font-medium mt-3 pl-11">
                      Jadwal ini merupakan jadwal perkuliahan resmi yang ditetapkan oleh program studi.
                    </p>
                  </div>
                )}

                {/* Booking Info (Approved / Pending) */}
                {isBorrowed && booking && (
                  <div className={`p-5 rounded-2xl border ${
                    infoData.data.status === 'approved' 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        infoData.data.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <h3 className="text-[14px] font-extrabold text-slate-800">Detail Peminjaman</h3>
                    </div>
                    
                    <div className="flex flex-col gap-3 pl-11">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                          Keperluan
                        </span>
                        <span className="text-[14px] font-bold text-slate-800">{booking.namaMatakuliah}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                          Dosen Pengampu
                        </span>
                        <span className="text-[14px] font-semibold text-slate-700">{booking.dosenPengampu}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          Durasi
                        </span>
                        <span className="text-[14px] font-semibold text-slate-700">{booking.durasiPemakaian} Sesi (Sesi {booking.session}–{booking.session + booking.durasiPemakaian - 1})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Borrowed without booking details */}
                {isBorrowed && !booking && (
                  <div className={`p-5 rounded-2xl border ${
                    infoData.data.status === 'approved' 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <p className="text-[14px] font-bold text-slate-700">{infoData.data.courseName}</p>
                    <p className="text-[12px] text-slate-400 font-medium mt-2">
                      {infoData.data.status === 'pending' ? 'Slot ini sedang menunggu persetujuan peminjaman.' : 'Ruangan ini sedang digunakan oleh peminjam.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
