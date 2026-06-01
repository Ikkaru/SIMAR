import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware untuk melindungi route admin.
 * Mengecek keberadaan cookie session admin sebelum mengizinkan akses.
 * 
 * Catatan: Middleware ini hanya cek keberadaan cookie (lightweight).
 * Validasi session token yang lebih mendalam dilakukan di server actions via requireAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin API routes (jika ada di masa depan)
  // Halaman /admin sendiri sudah di-protect di page level via verifyAdmin()
  // Middleware ini sebagai layer pertahanan tambahan

  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('admin_session');

    // Jika tidak ada session cookie sama sekali, redirect ke halaman admin login
    // Halaman /admin akan menampilkan form login jika session invalid
    if (!sessionCookie?.value) {
      // Untuk halaman /admin itu sendiri, biarkan lewat karena sudah ada logic
      // login/dashboard di page component. Tapi untuk sub-routes, redirect.
      if (pathname !== '/admin') {
        const loginUrl = new URL('/admin', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match admin routes
    '/admin/:path*',
  ],
};
