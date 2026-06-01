'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookingRequest, BookingStatus, Day, SessionNumber, RoomName, DAYS, getSessionTimes, getWeekDates } from '@/lib/types';
import { 
  fetchAllBookings, fetchBookingStats, reviewBooking, logoutAdmin,
  toggleSlotLock, removeBooking, updateBooking, fetchRoomStats,
  addOfficialSchedule, editOfficialSchedule, deleteOfficialSchedule,
  createAnnouncement, deleteAnnouncement, toggleAnnouncementActive, fetchAllAnnouncements,
  Announcement, AnnouncementType
} from '@/lib/actions';
import DaySelector from './DaySelector';
import ScheduleTable, { SlotDisplayData } from './ScheduleTable';

type FilterStatus = 'all' | BookingStatus;

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [roomStats, setRoomStats] = useState<{ room: string; bookedCount: number; approvedCount: number }[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [selectedDay, setSelectedDay] = useState<Day>('Senin');
  const [refreshKey, setRefreshKey] = useState(0);

  const [dates, setDates] = useState<Record<Day, { dateObj: Date; formatted: string }> | null>(null);
  useEffect(() => { setDates(getWeekDates()); }, []);

  // Inspector Modal State
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<{ day: Day; session: SessionNumber; room: RoomName; status: string; courseName: string; booking?: BookingRequest } | null>(null);
  const [lockNote, setLockNote] = useState('');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ namaPJ: '', namaMatakuliah: '', dosenPengampu: '', durasiPemakaian: 1 });

  // Schedule Management State
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [scheduleCourseName, setScheduleCourseName] = useState('');
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newScheduleCourseName, setNewScheduleCourseName] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [statsRes, bookingsRes, roomStatsRes] = await Promise.all([
      fetchBookingStats(),
      fetchAllBookings(),
      fetchRoomStats()
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (bookingsRes.success && bookingsRes.data) setBookings(bookingsRes.data);
    if (roomStatsRes.success && roomStatsRes.data) setRoomStats(roomStatsRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Announcement State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<AnnouncementType>('info');
  const [annDuration, setAnnDuration] = useState('24');

  const loadAnnouncements = useCallback(async () => {
    const res = await fetchAllAnnouncements();
    if (res.success && res.data) setAnnouncements(res.data);
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const filteredBookings = bookings.filter((b) => filter === 'all' || b.status === filter);

  const handleReview = async (id: string, action: 'approved' | 'rejected') => {
    const res = await reviewBooking(id, action);
    if (res.success) {
      showToast(res.message, 'success');
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    window.location.reload();
  };

  const executeSync = async () => {
    setIsLoading(true);
    const { syncSIGenerate } = await import('@/lib/actions');
    const res = await syncSIGenerate(syncTahun, syncSemester);
    if (res.success) {
      showToast(res.message, 'success');
      setSyncModalOpen(false);
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setClearHistoryModalOpen(true);
  };

  const executeClearHistory = async () => {
    setIsLoading(true);
    const { resetWeeklyBookings } = await import('@/lib/actions');
    const res = await resetWeeklyBookings();
    if (res.success) {
      showToast(res.message, 'success');
      setClearHistoryModalOpen(false);
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
      setIsLoading(false);
    }
  };

  const handleSlotClick = (
    day: Day,
    session: SessionNumber,
    room: RoomName,
    maxDur: number,
    data: SlotDisplayData
  ) => {
    setInspectorData({ day, session, room, status: data.status, courseName: data.courseName, booking: data.booking });
    setLockNote(data.status === 'locked' ? data.courseName : '');
    setIsEditing(false);
    setIsEditingSchedule(false);
    setScheduleCourseName(data.courseName || '');
    setIsAddingSchedule(false);
    setNewScheduleCourseName('');
    setInspectorOpen(true);
  };

  // ─── Schedule CRUD Handlers ─────────────────────────────────
  const handleAddSchedule = async () => {
    if (!inspectorData) return;
    const res = await addOfficialSchedule(
      inspectorData.day, inspectorData.session, inspectorData.room, newScheduleCourseName
    );
    if (res.success) {
      showToast(res.message, 'success');
      setInspectorOpen(false);
      setIsAddingSchedule(false);
      setNewScheduleCourseName('');
      setRefreshKey(k => k + 1);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleEditSchedule = async () => {
    if (!inspectorData) return;
    const res = await editOfficialSchedule(
      inspectorData.day, inspectorData.session, inspectorData.room, scheduleCourseName
    );
    if (res.success) {
      showToast(res.message, 'success');
      setIsEditingSchedule(false);
      setInspectorOpen(false);
      setRefreshKey(k => k + 1);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!inspectorData) return;
    const res = await deleteOfficialSchedule(
      inspectorData.day, inspectorData.session, inspectorData.room
    );
    if (res.success) {
      showToast(res.message, 'success');
      setInspectorOpen(false);
      setRefreshKey(k => k + 1);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleToggleLock = async (isLocking: boolean) => {
    if (!inspectorData) return;
    const res = await toggleSlotLock(inspectorData.day, inspectorData.session, inspectorData.room, isLocking, lockNote);
    if (res.success) {
      showToast(res.message, 'success');
      setInspectorOpen(false);
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // Full Room Lock State
  const [roomLockModalOpen, setRoomLockModalOpen] = useState(false);
  const [selectedRoomToLock, setSelectedRoomToLock] = useState<RoomName | null>(null);
  const [roomLockType, setRoomLockType] = useState<'day' | 'permanent' | 'custom'>('day');
  const [roomLockCustomDate, setRoomLockCustomDate] = useState('');
  const [roomLockNote, setRoomLockNote] = useState('');
  const [isCurrentlyLocked, setIsCurrentlyLocked] = useState(false);

  // Clear History Modal State
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);

  // Sync SIGenerate Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTahun, setSyncTahun] = useState('2024');
  const [syncSemester, setSyncSemester] = useState('1');

  const handleRoomHeaderClick = (room: RoomName, isLocked: boolean, currentNote: string) => {
    setSelectedRoomToLock(room);
    setIsCurrentlyLocked(isLocked);
    setRoomLockType('day');
    setRoomLockCustomDate('');
    setRoomLockNote(currentNote || '');
    setRoomLockModalOpen(true);
  };

  const submitRoomLock = async () => {
    if (!selectedRoomToLock || !dates) return;
    
    setIsLoading(true);
    let lockDates: string[] = [];
    if (roomLockType === 'day') {
      lockDates = [dates[selectedDay].dateObj.toISOString().split('T')[0]];
    } else if (roomLockType === 'custom') {
      if (!roomLockCustomDate) {
        showToast('Pilih tanggal akhir kustom terlebih dahulu', 'error');
        setIsLoading(false);
        return;
      }
      
      const startDateStr = dates[selectedDay].dateObj.toISOString().split('T')[0];
      const start = new Date(startDateStr);
      const end = new Date(roomLockCustomDate);
      
      const current = new Date(start);
      while (current <= end) {
        // Only lock Monday-Friday (1-5)
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          lockDates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (lockDates.length === 0) {
        showToast('Tanggal akhir tidak valid atau hanya jatuh di akhir pekan', 'error');
        setIsLoading(false);
        return;
      }
    }

    const { setRoomLockFull } = await import('@/lib/actions');
    const res = await setRoomLockFull(selectedRoomToLock, roomLockType, lockDates, roomLockNote);
    
    setIsLoading(false);
    if (res.success) {
      showToast(res.message, 'success');
      setRoomLockModalOpen(false);
      setRefreshKey(k => k + 1);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRemoveRoomLock = async () => {
    if (!selectedRoomToLock) return;
    setIsLoading(true);
    const { removeRoomLockFull } = await import('@/lib/actions');
    const res = await removeRoomLockFull(selectedRoomToLock);
    setIsLoading(false);
    if (res.success) {
      showToast(res.message, 'success');
      setRoomLockModalOpen(false);
      setRefreshKey(k => k + 1);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus booking ini?')) return;
    const res = await removeBooking(id);
    if (res.success) {
      showToast(res.message, 'success');
      setInspectorOpen(false);
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSaveEdit = async (id: string) => {
    const res = await updateBooking(id, editForm);
    if (res.success) {
      showToast(res.message, 'success');
      setIsEditing(false);
      setInspectorOpen(false);
      setRefreshKey(k => k + 1);
      loadData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const startEdit = (booking: BookingRequest) => {
    setEditForm({
      namaPJ: booking.namaPJ,
      namaMatakuliah: booking.namaMatakuliah,
      dosenPengampu: booking.dosenPengampu,
      durasiPemakaian: booking.durasiPemakaian
    });
    setIsEditing(true);
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-[34px] font-extrabold text-slate-800 tracking-tight mb-2">Dashboard Admin</h1>
          <p className="text-[15px] text-slate-500 leading-relaxed">Kelola jadwal, inspeksi ruangan, dan tinjau permintaan peminjaman.</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={() => setSyncModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[14px] text-white bg-sky-600 border border-sky-700 hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-600/20 transition-all outline-none focus:ring-2 focus:ring-sky-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Sinkronkan SIGenerate
          </button>
          <button onClick={handleClearHistory} className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-white bg-rose-600 border border-rose-700 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/20 transition-all outline-none focus:ring-2 focus:ring-rose-300">
            Reset Mingguan
          </button>
          <button onClick={handleLogout} className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all outline-none focus:ring-2 focus:ring-rose-200">
            Keluar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex justify-between items-start relative z-10 mb-4">
            <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Total Request</div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center text-xl shadow-sm">📋</div>
          </div>
          <div className="text-4xl font-black text-slate-800 relative z-10">{isLoading ? '-' : stats.total}</div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex justify-between items-start relative z-10 mb-4">
            <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Menunggu Review</div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shadow-sm">⏳</div>
          </div>
          <div className="text-4xl font-black text-slate-800 relative z-10">{isLoading ? '-' : stats.pending}</div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex justify-between items-start relative z-10 mb-4">
            <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Disetujui</div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-sm">✓</div>
          </div>
          <div className="text-4xl font-black text-slate-800 relative z-10">{isLoading ? '-' : stats.approved}</div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex justify-between items-start relative z-10 mb-4">
            <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Ditolak</div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shadow-sm">✕</div>
          </div>
          <div className="text-4xl font-black text-slate-800 relative z-10">{isLoading ? '-' : stats.rejected}</div>
        </div>
      </div>

      <div className="glass-card mb-10 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Interaksi Jadwal & Inspeksi</h2>
          <button
            onClick={() => setScheduleEditMode(m => !m)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all outline-none focus:ring-2 ${
              scheduleEditMode
                ? 'text-white bg-violet-600 border border-violet-700 hover:bg-violet-700 shadow-lg shadow-violet-600/20 focus:ring-violet-300'
                : 'text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 focus:ring-violet-200'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {scheduleEditMode ? '✓ Mode Edit Jadwal Aktif' : 'Kelola Jadwal Resmi'}
          </button>
        </div>
        <div className="p-6 lg:p-8">
          <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          <ScheduleTable 
            selectedDay={selectedDay} 
            refreshKey={refreshKey} 
            adminMode={true} 
            onSlotClick={handleSlotClick} 
            onRoomHeaderClick={handleRoomHeaderClick}
          />
        </div>
      </div>

      <div className="glass-card mb-10 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Daftar Permintaan Peminjaman</h2>
          
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
            <button className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`} onClick={() => setFilter('all')}>
              Semua <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'all' ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/50 text-slate-500'}`}>{stats.total}</span>
            </button>
            <button className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`} onClick={() => setFilter('pending')}>
              Pending <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/50 text-slate-500'}`}>{stats.pending}</span>
            </button>
            <button className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${filter === 'approved' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`} onClick={() => setFilter('approved')}>
              Dipinjam <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/50 text-slate-500'}`}>{stats.approved}</span>
            </button>
            <button className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${filter === 'rejected' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`} onClick={() => setFilter('rejected')}>
              Ditolak <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/50 text-slate-500'}`}>{stats.rejected}</span>
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card skeleton h-[220px]" />
              ))
            ) : filteredBookings.length === 0 ? (
              <div className="col-span-full glass-card flex flex-col items-center justify-center p-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-4xl mb-6 text-slate-400">📋</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Tidak ada data</h3>
                <p className="text-slate-500 max-w-sm">Belum ada peminjaman ruangan dengan status ini.</p>
              </div>
            ) : (
              filteredBookings.map((b) => (
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

                  <div className="flex flex-col gap-3 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                      <span className="text-[13px] font-semibold text-slate-800 ml-5">{b.day} {dates?.[b.day]?.formatted ? `(${dates[b.day].formatted})` : ''}, Sesi {b.session}-{b.session + b.durasiPemakaian - 1}</span>
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

                  {b.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button onClick={() => handleReview(b.id, 'rejected')} className="w-full px-4 py-2.5 rounded-xl font-bold text-[13px] text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition-all active:scale-95">Tolak</button>
                      <button onClick={() => handleReview(b.id, 'approved')} className="w-full px-4 py-2.5 rounded-xl font-bold text-[13px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 hover:border-emerald-400 transition-all active:scale-95 shadow-sm shadow-emerald-500/20">Setujui</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Announcement Management Section */}
      <div className="glass-card mb-10 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Kelola Pengumuman</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Buat pemberitahuan yang tampil di seluruh halaman website.</p>
          </div>
          <button
            onClick={() => setAnnouncementFormOpen(o => !o)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all outline-none focus:ring-2 ${
              announcementFormOpen
                ? 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 focus:ring-slate-300'
                : 'text-white bg-sky-600 border border-sky-700 hover:bg-sky-700 shadow-sm focus:ring-sky-300'
            }`}
          >
            {announcementFormOpen ? 'Tutup Form' : '+ Buat Pengumuman'}
          </button>
        </div>

        {/* Create Announcement Form */}
        {announcementFormOpen && (
          <div className="px-8 py-6 border-b border-slate-100 bg-sky-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Judul Pengumuman</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  placeholder="misal: Perubahan Jadwal Kuliah Minggu Depan"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Pesan / Detail</label>
                <textarea
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Tuliskan detail pengumuman..."
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Tipe</label>
                <select
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                >
                  <option value="info">ℹ️ Informasi (Biru)</option>
                  <option value="warning">⚠️ Peringatan (Kuning)</option>
                  <option value="urgent">🚨 Urgent / Penting (Merah)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Durasi Tampil</label>
                <select
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  value={annDuration}
                  onChange={(e) => setAnnDuration(e.target.value)}
                >
                  <option value="1">1 Jam</option>
                  <option value="6">6 Jam</option>
                  <option value="12">12 Jam</option>
                  <option value="24">1 Hari (24 Jam)</option>
                  <option value="72">3 Hari</option>
                  <option value="168">7 Hari</option>
                </select>
              </div>
            </div>
            <button
              className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                const res = await createAnnouncement(annTitle, annMessage, annType, parseFloat(annDuration));
                setIsLoading(false);
                if (res.success) {
                  showToast(res.message, 'success');
                  setAnnTitle(''); setAnnMessage(''); setAnnType('info'); setAnnDuration('24');
                  setAnnouncementFormOpen(false);
                  loadAnnouncements();
                } else {
                  showToast(res.message, 'error');
                }
              }}
            >
              {isLoading ? 'Membuat...' : 'Publikasikan Pengumuman'}
            </button>
          </div>
        )}

        {/* Announcements List */}
        <div className="p-6 lg:p-8">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-400">📢</div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Belum ada pengumuman</h3>
              <p className="text-[13px] text-slate-500">Buat pengumuman baru untuk ditampilkan di website.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((ann) => {
                const now = new Date();
                const expiresAt = new Date(ann.expiresAt);
                const isExpired = expiresAt < now;
                const isActive = ann.isActive && !isExpired;

                const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
                  info: { label: 'Info', color: 'text-sky-700', bg: 'bg-sky-100' },
                  warning: { label: 'Peringatan', color: 'text-amber-700', bg: 'bg-amber-100' },
                  urgent: { label: 'Urgent', color: 'text-rose-700', bg: 'bg-rose-100' },
                };
                const tl = typeLabels[ann.type] || typeLabels.info;

                // Format remaining time
                let timeLeft = '';
                if (!isExpired) {
                  const diffMs = expiresAt.getTime() - now.getTime();
                  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  if (diffH > 24) timeLeft = `${Math.floor(diffH / 24)} hari ${diffH % 24} jam`;
                  else if (diffH > 0) timeLeft = `${diffH} jam ${diffM} menit`;
                  else timeLeft = `${diffM} menit`;
                }

                return (
                  <div key={ann.id} className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                    isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${tl.bg} ${tl.color}`}>{tl.label}</span>
                        {isActive && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Aktif</span>}
                        {isExpired && <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-500">Expired</span>}
                        {!ann.isActive && !isExpired && <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-500">Nonaktif</span>}
                      </div>
                      <h4 className="text-[15px] font-extrabold text-slate-800 leading-snug">{ann.title}</h4>
                      {ann.message !== ann.title && <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{ann.message}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                        {!isExpired && <span>Sisa: {timeLeft}</span>}
                        <span>Dibuat: {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!isExpired && (
                        <button
                          className={`px-4 py-2 rounded-xl font-bold text-[12px] transition-colors border ${
                            ann.isActive
                              ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          onClick={async () => {
                            const res = await toggleAnnouncementActive(ann.id, !ann.isActive);
                            if (res.success) { showToast(res.message, 'success'); loadAnnouncements(); }
                            else showToast(res.message, 'error');
                          }}
                        >
                          {ann.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                      <button
                        className="px-4 py-2 rounded-xl font-bold text-[12px] text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                        onClick={async () => {
                          const res = await deleteAnnouncement(ann.id);
                          if (res.success) { showToast(res.message, 'success'); loadAnnouncements(); }
                          else showToast(res.message, 'error');
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inspector Modal */}
      {inspectorOpen && inspectorData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={() => setInspectorOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl shadow-slate-900/10 w-full max-w-[560px] max-h-[90vh] flex flex-col animate-[slideUp_300ms_ease-out] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400" />
            
            <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-slate-100">
              <div className="flex flex-col gap-1">
                <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Inspeksi Ruangan</h2>
                <span className="text-[13px] text-slate-500 font-medium">Kelola status dan data peminjaman ruangan.</span>
              </div>
              <button className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-rose-200" onClick={() => setInspectorOpen(false)}>✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              <div className="flex flex-wrap gap-4 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
                <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ruangan</span>
                  <span className="text-[15px] font-extrabold text-slate-800">{inspectorData.room}</span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hari / Sesi</span>
                  <span className="text-[14px] font-bold text-slate-800">{inspectorData.day}, Sesi {inspectorData.session}</span>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status Saat Ini</span>
                  <span className={`text-[13px] font-bold capitalize inline-flex w-fit px-2 py-0.5 rounded border ${
                    inspectorData.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    inspectorData.status === 'scheduled' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                    inspectorData.status === 'locked' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {inspectorData.status === 'available' ? 'Tersedia' : inspectorData.status}
                  </span>
                </div>
              </div>

              {/* Booking Edit / Details */}
              {inspectorData.booking && (
                <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100 mb-6">
                  <h3 className="text-[15px] font-extrabold text-sky-900 mb-4 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Detail Peminjaman <span className="text-sky-600/60 font-medium text-[13px] ml-1">({inspectorData.booking.id})</span>
                  </h3>
                  
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-sky-700 uppercase tracking-widest mb-1.5">Penanggung Jawab</label>
                        <input className="w-full px-4 py-2.5 bg-white border border-sky-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all" placeholder="Nama PJ" value={editForm.namaPJ} onChange={(e) => setEditForm({...editForm, namaPJ: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-sky-700 uppercase tracking-widest mb-1.5">Mata Kuliah / Keperluan</label>
                        <input className="w-full px-4 py-2.5 bg-white border border-sky-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all" placeholder="Mata Kuliah" value={editForm.namaMatakuliah} onChange={(e) => setEditForm({...editForm, namaMatakuliah: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-sky-700 uppercase tracking-widest mb-1.5">Dosen Pengampu</label>
                        <input className="w-full px-4 py-2.5 bg-white border border-sky-200 rounded-xl text-[14px] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all" placeholder="Dosen" value={editForm.dosenPengampu} onChange={(e) => setEditForm({...editForm, dosenPengampu: e.target.value})} />
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button className="flex-1 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white bg-sky-600 hover:bg-sky-700 transition-colors" onClick={() => handleSaveEdit(inspectorData.booking!.id)}>Simpan Perubahan</button>
                        <button className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => setIsEditing(false)}>Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 text-[14px]">
                      <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-sky-100/50 pb-3">
                        <span className="font-bold text-sky-800/70 text-[12px] uppercase tracking-wider">PJ</span>
                        <span className="font-semibold text-sky-900">{inspectorData.booking.namaPJ}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-sky-100/50 pb-3">
                        <span className="font-bold text-sky-800/70 text-[12px] uppercase tracking-wider">Keperluan</span>
                        <span className="font-semibold text-sky-900">{inspectorData.booking.namaMatakuliah}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-sky-100/50 pb-3">
                        <span className="font-bold text-sky-800/70 text-[12px] uppercase tracking-wider">Dosen</span>
                        <span className="font-semibold text-sky-900">{inspectorData.booking.dosenPengampu}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2 pb-1">
                        <span className="font-bold text-sky-800/70 text-[12px] uppercase tracking-wider">Durasi</span>
                        <span className="font-semibold text-sky-900">{inspectorData.booking.durasiPemakaian} Jam</span>
                      </div>
                      
                      <div className="flex gap-3 mt-4">
                        <button className="px-5 py-2 rounded-xl font-bold text-[13px] text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 transition-colors shadow-sm" onClick={() => startEdit(inspectorData.booking!)}>Edit Data</button>
                        <button className="px-5 py-2 rounded-xl font-bold text-[13px] text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors" onClick={() => handleDeleteBooking(inspectorData.booking!.id)}>Hapus Booking</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scheduled/Borrowed — Read-only info OR Edit mode */}
              {(inspectorData.status === 'scheduled' || inspectorData.status === 'borrowed') && (
                scheduleEditMode ? (
                  <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-200 mb-6">
                    <h3 className="text-[15px] font-extrabold text-violet-900 mb-4 flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Kelola Jadwal Resmi
                    </h3>

                    {isEditingSchedule ? (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-violet-700 uppercase tracking-widest mb-1.5">Nama Mata Kuliah</label>
                          <input
                            className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl text-[14px] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
                            placeholder="Nama Mata Kuliah"
                            value={scheduleCourseName}
                            onChange={(e) => setScheduleCourseName(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button className="flex-1 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white bg-violet-600 hover:bg-violet-700 transition-colors" onClick={handleEditSchedule}>Simpan Perubahan</button>
                          <button className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => setIsEditingSchedule(false)}>Batal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-violet-100/50 pb-3">
                          <span className="font-bold text-violet-800/70 text-[12px] uppercase tracking-wider">Mata Kuliah</span>
                          <span className="font-semibold text-violet-900 text-[14px]">{inspectorData.courseName}</span>
                        </div>
                        <div className="flex gap-3 mt-1">
                          <button
                            className="px-5 py-2 rounded-xl font-bold text-[13px] text-violet-700 bg-white border border-violet-200 hover:bg-violet-50 transition-colors shadow-sm"
                            onClick={() => { setScheduleCourseName(inspectorData.courseName); setIsEditingSchedule(true); }}
                          >
                            Edit Jadwal
                          </button>
                          <button
                            className="px-5 py-2 rounded-xl font-bold text-[13px] text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                            onClick={handleDeleteSchedule}
                          >
                            Hapus Jadwal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200/60 flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-amber-900 mb-1">Jadwal Resmi</h4>
                      <p className="text-[13px] text-amber-700/80 font-medium leading-relaxed">Ini adalah jadwal perkuliahan resmi. Untuk mengedit atau menghapus jadwal ini, aktifkan <strong>Mode Edit Jadwal</strong> dengan tombol <strong>"Kelola Jadwal Resmi"</strong> di atas tabel.</p>
                    </div>
                  </div>
                )
              )}

              {/* Add Schedule for Available Slots (only in edit mode) */}
              {scheduleEditMode && inspectorData.status === 'available' && (
                <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-200 mb-6">
                  <h3 className="text-[15px] font-extrabold text-violet-900 mb-4 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg>
                    Tambah Jadwal Resmi
                  </h3>

                  {isAddingSchedule ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-violet-700 uppercase tracking-widest mb-1.5">Nama Mata Kuliah</label>
                        <input
                          className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl text-[14px] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
                          placeholder="misal: Sistem Digital (A) (Semester 1)"
                          value={newScheduleCourseName}
                          onChange={(e) => setNewScheduleCourseName(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button className="flex-1 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm" onClick={handleAddSchedule}>Tambahkan Jadwal</button>
                        <button className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => setIsAddingSchedule(false)}>Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[13px] text-violet-700/80 font-medium leading-relaxed mb-4">Slot ini kosong. Anda bisa menambahkan jadwal resmi secara manual.</p>
                      <button
                        className="px-5 py-2.5 rounded-xl font-bold text-[13px] text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm"
                        onClick={() => setIsAddingSchedule(true)}
                      >
                        + Tambah Jadwal Manual
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Lock Controls */}
              {!inspectorData.booking && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="text-[15px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Kontrol Ruangan
                  </h3>
                  {inspectorData.status === 'locked' ? (
                    <div>
                      <p className="text-[13px] text-slate-600 mb-4 bg-white p-3 rounded-xl border border-slate-200">Keterangan Kunci: <strong className="text-slate-800">{lockNote}</strong></p>
                      <button className="px-5 py-2.5 rounded-xl font-bold text-[13px] text-emerald-700 bg-emerald-100 border border-emerald-200 hover:bg-emerald-200 transition-colors shadow-sm" onClick={() => handleToggleLock(false)}>Buka Kunci Ruangan</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Keterangan (Opsional)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 outline-none transition-all" 
                          placeholder="misal: Kelas Dibatalkan, Maintenance" 
                          value={lockNote} 
                          onChange={(e) => setLockNote(e.target.value)}
                        />
                      </div>
                      <button className="w-fit px-5 py-2.5 rounded-xl font-bold text-[13px] text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-md" onClick={() => handleToggleLock(true)}>Terapkan Kunci Ruangan</button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Room Lock Modal */}
      {roomLockModalOpen && selectedRoomToLock && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={() => setRoomLockModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[500px] flex flex-col relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-600 to-slate-800" />
            <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-slate-100">
              <div className="flex flex-col gap-1">
                <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Kunci Ruangan</h2>
                <span className="text-[13px] text-slate-500 font-medium">Manajemen status ruangan <strong className="text-sky-600">{selectedRoomToLock}</strong></span>
              </div>
              <button className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors" onClick={() => setRoomLockModalOpen(false)}>✕</button>
            </div>
            <div className="p-8 flex flex-col gap-5">
              {isCurrentlyLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                  <p className="text-[13px] text-amber-800 font-bold mb-3">Ruangan ini sedang dalam status terkunci.</p>
                  <button className="w-full px-4 py-2.5 rounded-lg font-bold text-[13px] text-white bg-rose-600 hover:bg-rose-700 transition-colors" onClick={handleRemoveRoomLock}>
                    Buka Kunci Ruangan Sekarang
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-2">Durasi Kunci</label>
                <div className="grid grid-cols-3 gap-3">
                  <button className={`px-3 py-2.5 border rounded-xl text-[12px] font-bold transition-all ${roomLockType === 'day' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`} onClick={() => setRoomLockType('day')}>
                    1 Hari<br/><span className="text-[10px] font-normal opacity-80">(Hari ini)</span>
                  </button>
                  <button className={`px-3 py-2.5 border rounded-xl text-[12px] font-bold transition-all ${roomLockType === 'permanent' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`} onClick={() => setRoomLockType('permanent')}>
                    Seterusnya<br/><span className="text-[10px] font-normal opacity-80">(Permanen)</span>
                  </button>
                  <button className={`px-3 py-2.5 border rounded-xl text-[12px] font-bold transition-all ${roomLockType === 'custom' ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`} onClick={() => setRoomLockType('custom')}>
                    Kustom<br/><span className="text-[10px] font-normal opacity-80">(Pilih Tanggal)</span>
                  </button>
                </div>
                
                {roomLockType === 'custom' && (
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-2">Sampai Tanggal</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 outline-none transition-all" 
                      value={roomLockCustomDate} 
                      onChange={(e) => setRoomLockCustomDate(e.target.value)}
                      min={dates?.[selectedDay]?.dateObj.toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-2">Alasan Kunci (Opsional)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 outline-none transition-all" 
                  placeholder="Misal: Maintenance AC, Rapat Prodi" 
                  value={roomLockNote} 
                  onChange={(e) => setRoomLockNote(e.target.value)}
                />
              </div>

              <button className="w-full mt-2 px-5 py-3.5 rounded-xl font-bold text-[14px] text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50" onClick={submitRoomLock} disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Terapkan Kunci Ruangan'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Clear History Modal */}
      {clearHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={() => setClearHistoryModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[480px] flex flex-col relative overflow-hidden animate-[slideUp_300ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-rose-700" />
            
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </div>
              <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight mb-2">Reset Pemesanan Mingguan?</h2>
              <p className="text-[14px] text-slate-500 leading-relaxed mb-8 px-4">
                Aksi ini akan menghapus permanen <strong>seluruh</strong> riwayat peminjaman (termasuk yang Pending, Disetujui, maupun Ditolak) untuk mengosongkan jadwal minggu ini.
              </p>
              
              <div className="flex gap-3 w-full">
                <button className="flex-1 px-4 py-3 rounded-xl font-bold text-[14px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => setClearHistoryModalOpen(false)}>
                  Batal
                </button>
                <button className="flex-1 px-4 py-3 rounded-xl font-bold text-[14px] text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50" onClick={executeClearHistory} disabled={isLoading}>
                  {isLoading ? 'Menghapus...' : 'Ya, Hapus Semua'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sync Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_200ms_ease-out]" onClick={() => setSyncModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[480px] flex flex-col relative overflow-hidden animate-[slideUp_300ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 to-sky-700" />
            
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              </div>
              <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight mb-2">Sinkronisasi SIGenerate</h2>
              <p className="text-[14px] text-slate-500 leading-relaxed mb-6 px-4">
                Sistem akan menyinkronkan jadwal resmi dari website <strong>jadwal.uns.ac.id</strong> untuk Program Studi Informatika dan Sains Data secara otomatis. Proses ini mungkin memakan waktu beberapa detik.
              </p>
              
              <div className="w-full flex gap-3 mb-8 text-left">
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-slate-700 mb-2">Tahun Ajar</label>
                  <input 
                    type="text" 
                    value={syncTahun}
                    onChange={(e) => setSyncTahun(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none transition-all" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-slate-700 mb-2">Semester</label>
                  <select 
                    value={syncSemester}
                    onChange={(e) => setSyncSemester(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none transition-all"
                  >
                    <option value="1">Ganjil</option>
                    <option value="2">Genap</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 w-full">
                <button className="flex-1 px-4 py-3 rounded-xl font-bold text-[14px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => setSyncModalOpen(false)}>
                  Batal
                </button>
                <button className="flex-1 px-4 py-3 rounded-xl font-bold text-[14px] text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-md shadow-sky-600/20 disabled:opacity-50" onClick={executeSync} disabled={isLoading}>
                  {isLoading ? 'Menyinkronkan...' : 'Mulai Sinkronisasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
