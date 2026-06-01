'use server';

import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase';

/**
 * Verifikasi apakah request berasal dari admin yang terautentikasi.
 * Membaca cookie `admin_session`, lalu validasi terhadap tabel `admin_sessions` di Supabase.
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) return false;

    const { data, error } = await supabaseAdmin
      .from('admin_sessions')
      .select('id, expires_at')
      .eq('token', sessionToken)
      .maybeSingle();

    if (error || !data) return false;

    // Cek apakah session sudah expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Hapus expired session
      await supabaseAdmin.from('admin_sessions').delete().eq('id', data.id);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Guard function: Throws error jika request bukan dari admin terautentikasi.
 * Panggil di awal SETIAP server action yang hanya boleh diakses admin.
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin authentication required.');
  }
}
