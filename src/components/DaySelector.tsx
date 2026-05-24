'use client';

import { Day, DAYS, getWeekDates, isDayPast } from '@/lib/types';
import { useMemo, useEffect, useState } from 'react';

interface DaySelectorProps {
  selectedDay: Day;
  onSelectDay: (day: Day) => void;
  disablePastDays?: boolean;
}

export default function DaySelector({ selectedDay, onSelectDay, disablePastDays = false }: DaySelectorProps) {
  // Use state to avoid hydration mismatch between server and client for dates
  const [dates, setDates] = useState<Record<Day, { dateObj: Date; formatted: string }> | null>(null);

  useEffect(() => {
    setDates(getWeekDates());
  }, []);

  return (
    <div className="flex gap-2 p-2 bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 overflow-x-auto mb-8" role="tablist" aria-label="Pilih Hari Perkuliahan">
      {DAYS.map((day) => {
        const isActive = selectedDay === day;
        const past = disablePastDays ? isDayPast(day) : false;
        const subLabel = dates ? dates[day].formatted : '...';

        return (
          <button
            key={day}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${day}`}
            id={`tab-${day}`}
            className={`flex-1 min-w-[120px] px-5 py-3.5 rounded-xl text-center whitespace-nowrap transition-all duration-200 outline-none ${
              isActive 
                ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-500/30 ring-offset-1 ring-offset-transparent' 
                : past
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:bg-slate-100'
            }`}
            onClick={() => {
              if (!past) onSelectDay(day);
            }}
            disabled={past}
          >
            <span className="block font-bold text-[14px]">{day}</span>
            <span className={`block text-[11px] font-medium mt-0.5 ${isActive ? 'opacity-90' : 'opacity-70'}`}>
              {subLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
