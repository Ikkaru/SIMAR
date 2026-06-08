'use client';

import { useState } from 'react';
import { Day, SessionNumber, RoomName, BookingFormData, getSessionTimes } from '@/lib/types';
import { submitBooking } from '@/lib/actions';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day;
  session: SessionNumber;
  room: RoomName;
  maxDuration: number;
  onSuccess: () => void;
}

export default function BookingModal({
  isOpen, onClose, day, session, room, maxDuration, onSuccess
}: BookingModalProps) {
  const [formData, setFormData] = useState<Omit<BookingFormData, 'day' | 'session' | 'room'>>({
    namaPJ: '',
    nim: '',
    durasiPemakaian: 1,
    namaMatakuliah: '',
    dosenPengampu: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sessionTimes = getSessionTimes(day);
  const startSessionTime = sessionTimes.find(s => s.sesi === session);
  const endSessionTime = sessionTimes.find(s => s.sesi === (session + formData.durasiPemakaian - 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'durasiPemakaian' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const data: BookingFormData = {
      ...formData,
      day,
      session,
      room,
    };

    const result = await submitBooking(data);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-[24px] shadow-2xl shadow-sky-900/10 w-full max-w-[560px] max-h-[90vh] flex flex-col animate-[slideUp_300ms_ease-out] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-400" />
        
        <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Formulir Peminjaman</h2>
            <span className="text-[13px] text-slate-500 font-medium">Silakan lengkapi data peminjaman di bawah ini.</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-rose-200" onClick={onClose} aria-label="Tutup modal">✕</button>
        </div>

        <div className="p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-[13.5px] text-rose-600 font-bold flex items-start gap-3 shadow-sm shadow-rose-100/50">
              <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 px-5 py-4 bg-gradient-to-br from-sky-50 to-blue-50/50 rounded-2xl border border-sky-100 mb-8">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Ruangan</span>
              <span className="text-[15px] font-extrabold text-sky-900">{room}</span>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Hari / Waktu</span>
              <span className="text-[14px] font-bold text-sky-900">
                {day}, {startSessionTime?.jamMulai} - {endSessionTime?.jamAkhir}
              </span>
            </div>
            <div className="flex flex-col gap-1 flex-[0.5]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Sesi</span>
              <span className="text-[14px] font-bold text-sky-900">
                {formData.durasiPemakaian > 1 
                  ? `${session} - ${session + formData.durasiPemakaian - 1}` 
                  : session}
              </span>
            </div>
          </div>

          <form id="booking-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="namaPJ" className="block text-[13px] font-bold text-slate-700 mb-2">Penanggung Jawab (PJ) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  id="namaPJ"
                  name="namaPJ"
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all disabled:opacity-50"
                  placeholder="Nama Lengkap"
                  value={formData.namaPJ}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="nim" className="block text-[13px] font-bold text-slate-700 mb-2">NIM <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  id="nim"
                  name="nim"
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all disabled:opacity-50"
                  placeholder="Nomor Induk Mahasiswa"
                  value={formData.nim}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="namaMatakuliah" className="block text-[13px] font-bold text-slate-700 mb-2">Mata Kuliah / Keperluan <span className="text-rose-500">*</span></label>
              <input
                type="text"
                id="namaMatakuliah"
                name="namaMatakuliah"
                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all disabled:opacity-50"
                placeholder="Misal: Pengganti Matakuliah Aljabar linear (B)"
                value={formData.namaMatakuliah}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="dosenPengampu" className="block text-[13px] font-bold text-slate-700 mb-2">Dosen Pengampu / Pembina <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  id="dosenPengampu"
                  name="dosenPengampu"
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all disabled:opacity-50"
                  placeholder="Nama dosen terkait"
                  value={formData.dosenPengampu}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="durasiPemakaian" className="block text-[13px] font-bold text-slate-700 mb-2">Durasi Pemakaian <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <select
                    id="durasiPemakaian"
                    name="durasiPemakaian"
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[14px] text-slate-800 font-medium focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                    value={formData.durasiPemakaian}
                    onChange={handleChange}
                    disabled={isLoading}
                  >
                    {Array.from({ length: maxDuration }, (_, i) => i + 1).map((dur) => (
                      <option key={dur} value={dur}>
                        {dur} Jam (Sesi {session} - {session + dur - 1})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 font-medium">Maksimal durasi berurutan: {maxDuration} jam</p>
              </div>
            </div>

          </form>
        </div>

        <div className="flex items-center gap-3 justify-end px-8 py-5 border-t border-slate-100 bg-slate-50/50">
          <button type="button" className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50" onClick={onClose} disabled={isLoading}>
            Batal
          </button>
          <button type="submit" form="booking-form" className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-white bg-gradient-to-r from-sky-500 to-sky-600 shadow-sm shadow-sky-500/20 hover:shadow-md hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-70 flex items-center justify-center min-w-[160px]" disabled={isLoading}>
            {isLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              'Ajukan Peminjaman'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
