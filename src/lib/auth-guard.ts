'use server';

import { cookies } from 'next/headers';
import { prisma } from './prisma';

/**
 * Verifikasi apakah request berasal dari admin yang terautentikasi.
 * Membaca cookie `admin_session`, lalu validasi terhadap tabel `admin_sessions` di Prisma.
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) return false;

    const session = await prisma.adminSession.findUnique({
      where: { token: sessionToken },
      select: { token: true, expiresAt: true }
    });

    if (!session) return false;

    // Cek apakah session sudah expired
    if (session.expiresAt < new Date()) {
      // Hapus expired session
      await prisma.adminSession.delete({ where: { token: session.token } });
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
