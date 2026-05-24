'use client';

import { useState, useEffect } from 'react';
import { BookingRequest } from '@/lib/types';
import { fetchAllBookings } from '@/lib/actions';

export default function StatusPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetchAllBookings();
      if (res.success && res.data) {
        setBookings(res.data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const filtered = bookings.filter(b => 
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.namaPJ.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.namaMatakuliah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1480px] mx-auto px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-[34px] font-extrabold text-slate-800 tracking-tight mb-2">Cek Status Request</h1>
          <p className="text-[15px] text-slate-500 leading-relaxed">
            Cari dan pantau status pengajuan peminjaman ruangan Anda di sini.
          </p>
        </div>
        
        <div className="relative w-full max-w-[360px] group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-[14px] text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-sm"
            placeholder="Cari ID, Nama PJ, atau Mata Kuliah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card skeleton h-[220px]" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full glass-card flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-4xl mb-6 text-slate-400">🔍</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Tidak ada request ditemukan</h3>
            <p className="text-slate-500 max-w-sm">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="glass-card p-6 flex flex-col relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-200/60 bg-white">
              {/* Status Indicator Line */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                b.status === 'pending' ? 'bg-amber-400' : 
                b.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">ID: {b.id}</div>
                  <h3 className="text-lg font-extrabold text-slate-800 leading-snug">{b.namaMatakuliah}</h3>
                </div>
                <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                  b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    b.status === 'pending' ? 'bg-amber-500 animate-pulse' : 
                    b.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  {b.status === 'approved' ? 'Dipinjam' : b.status === 'pending' ? 'Pending' : 'Ditolak'}
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-3 4H9v5h4v-5z"/></svg> Ruangan
                  </span>
                  <span className="text-[13px] font-semibold text-slate-800 ml-5">{b.room}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Waktu
                  </span>
                  <span className="text-[13px] font-semibold text-slate-800 ml-5">{b.day}, Sesi {b.session}-{b.session + b.durasiPemakaian - 1}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Penanggung Jawab
                  </span>
                  <span className="text-[13px] font-semibold text-slate-800 ml-5">{b.namaPJ} <span className="text-slate-400 font-medium ml-1">({b.nim || '-'})</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> Dosen Pengampu
                  </span>
                  <span className="text-[13px] font-semibold text-slate-800 ml-5">{b.dosenPengampu}</span>
                </div>
              </div>
              
              {b.reviewNote && (
                <div className="mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200 text-[13px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-bold block mb-1 text-[11px] uppercase tracking-wider">Catatan Admin</strong>
                  {b.reviewNote}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
