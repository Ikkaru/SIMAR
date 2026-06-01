'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Jadwal Ruangan' },
    { href: '/available', label: 'Ruangan Kosong' },
    { href: '/status', label: 'Cek Status' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all duration-300">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image 
            src="/logo.png" 
            alt="SIMAR Logo" 
            width={48} 
            height={48} 
            className="w-auto h-11 drop-shadow-sm group-hover:scale-105 transition-all duration-300"
            priority
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-800 tracking-tight leading-tight">SIMAR</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">FATISDA UNS</span>
          </div>
        </Link>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          
          <div className="w-px h-6 bg-slate-200 mx-2" />
          
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-xl text-[14px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md hover:shadow-amber-500/20 transition-all duration-200 hover:-translate-y-0.5 ml-1"
          >
            Admin Prodi
          </Link>
        </nav>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-lg p-4 flex flex-col gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-3 rounded-xl text-[15px] font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="h-px w-full bg-slate-100 my-1" />
          <Link
            href="/admin"
            className="px-4 py-3 rounded-xl text-[15px] font-bold bg-amber-500 text-white text-center shadow-sm"
            onClick={() => setMenuOpen(false)}
          >
            Admin Prodi
          </Link>
        </div>
      )}
    </header>
  );
}
