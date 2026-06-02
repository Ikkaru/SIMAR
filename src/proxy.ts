import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Inisialisasi Redis (jika env vars tersedia)
const redisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisConfigured ? Redis.fromEnv() : null;

// Ratelimiter: 3 request per 30 menit
const ratelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "30 m"),
  analytics: true,
}) : null;

const BAN_PREFIX = "banned_ip:";
const FAILED_ATTEMPT_PREFIX = "failed_attempts:";

/**
 * Middleware untuk melindungi route admin.
 * Mengecek keberadaan cookie session admin sebelum mengizinkan akses.
 * 
 * Catatan: Middleware ini hanya cek keberadaan cookie (lightweight).
 * Validasi session token yang lebih mendalam dilakukan di server actions via requireAdmin().
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==== RATE LIMIT LOGIC ====
  if (request.method === "POST" && redis && ratelimit) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? "127.0.0.1";
    
    try {
      const isBanned = await redis.get(`${BAN_PREFIX}${ip}`);
      if (isBanned) {
        return NextResponse.json(
          { success: false, message: "Akses diblokir sementara karena aktivitas mencurigakan. Silakan coba lagi dalam 10 jam." },
          { status: 429 }
        );
      }

      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);

      if (!success) {
        const failedAttemptsKey = `${FAILED_ATTEMPT_PREFIX}${ip}`;
        const failedAttempts = await redis.incr(failedAttemptsKey);
        
        if (failedAttempts === 1) {
          await redis.expire(failedAttemptsKey, 1800);
        }

        if (failedAttempts > 3) {
          await redis.setex(`${BAN_PREFIX}${ip}`, 36000, "banned");
          return NextResponse.json(
            { success: false, message: "Akses diblokir sementara karena aktivitas mencurigakan. Silakan coba lagi dalam 10 jam." },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { success: false, message: "Terlalu banyak request. Harap tunggu beberapa saat sebelum mencoba lagi." },
          { 
            status: 429, 
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error("Rate Limit Error:", error);
    }
  }
  // ==== END RATE LIMIT LOGIC ====

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
    // Apply to all routes to catch server actions, excluding static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
