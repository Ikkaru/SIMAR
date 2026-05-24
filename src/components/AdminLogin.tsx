'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/lib/actions';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await loginAdmin(password);
    if (result.success) {
      router.refresh(); // Will trigger re-render of layout/page and show dashboard
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-white/80 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-sky-900/10 border border-slate-200/60 p-10 text-center animate-[slideUp_400ms_ease-out]">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold mx-auto shadow-lg shadow-sky-500/30 mb-6">
          SR
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2.5">Admin Prodi</h1>
        <p className="text-[15px] font-medium text-slate-500 mb-8 leading-relaxed">
          Masuk untuk mengelola jadwal dan menyetujui peminjaman ruangan.
        </p>
        
        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-6">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              type="password"
              id="password"
              className={`w-full px-5 py-4 bg-slate-50/80 border ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/10'} rounded-2xl text-[15px] text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 outline-none transition-all disabled:opacity-50`}
              placeholder="Masukkan password admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {error && (
              <div className="mt-2.5 text-[13px] font-semibold text-rose-600 flex items-center gap-1.5 px-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full px-6 py-4 rounded-2xl font-bold text-[15px] text-white bg-gradient-to-r from-sky-500 to-sky-600 shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 flex justify-center items-center gap-2"
            disabled={isLoading || !password}
          >
            {isLoading ? (
              <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Memverifikasi...</>
            ) : (
              'Masuk ke Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 text-[13px] font-medium text-slate-400">
          Gunakan <code className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[12px] border border-slate-200">admin</code> untuk demo.
        </div>
      </div>
    </div>
  );
}
