'use client';

import { useEffect, useState } from 'react';
import { fetchActiveAnnouncements, Announcement } from '@/lib/actions';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const res = await fetchActiveAnnouncements();
      if (res.success && res.data) {
        setAnnouncements(res.data);
      }
    };
    load();

    // Refresh every 60 seconds to catch new announcements or expirations
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const typeConfig = {
    info: {
      bg: 'bg-gradient-to-r from-sky-600 to-sky-700',
      border: 'border-sky-800/20',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      ),
      label: 'Informasi',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
      border: 'border-amber-700/20',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ),
      label: 'Peringatan',
    },
    urgent: {
      bg: 'bg-gradient-to-r from-rose-600 to-rose-700',
      border: 'border-rose-800/20',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ),
      label: 'Penting',
    },
  };

  return (
    <div className="flex flex-col">
      {visible.map((announcement) => {
        const cfg = typeConfig[announcement.type] || typeConfig.info;

        return (
          <div
            key={announcement.id}
            className={`${cfg.bg} text-white border-b ${cfg.border} animate-[slideDown_400ms_ease-out]`}
          >
            <div className="max-w-[1480px] mx-auto px-6 lg:px-8 py-3 flex items-start sm:items-center gap-3 sm:gap-4">
              {/* Icon */}
              <div className="shrink-0 mt-0.5 sm:mt-0 opacity-90">
                {cfg.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{cfg.label}</span>
                </div>
                <p className="text-[13px] sm:text-[14px] font-bold leading-snug">
                  {announcement.title}
                </p>
                {announcement.message !== announcement.title && (
                  <p className="text-[12px] sm:text-[13px] font-medium opacity-85 leading-relaxed mt-0.5">
                    {announcement.message}
                  </p>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={() => handleDismiss(announcement.id)}
                className="shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors outline-none focus:ring-2 focus:ring-white/30"
                aria-label="Tutup pengumuman"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
