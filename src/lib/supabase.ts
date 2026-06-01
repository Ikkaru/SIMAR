import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Environment Variables ──────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ─── Fail-fast jika credentials tidak dikonfigurasi ─────────
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'FATAL: Supabase credentials not configured. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

// ─── Public Client (Anon Key — RLS enforced) ────────────────
// Digunakan untuk operasi yang boleh diakses publik (read schedules, submit booking)
export const supabasePublic: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ─── Admin Client (Service Role Key — bypasses RLS) ─────────
// Digunakan HANYA di server-side untuk operasi admin (approve, lock, delete)
// Jika service role key tidak dikonfigurasi, fallback ke anon key dengan warning
let supabaseAdminClient: SupabaseClient;
if (supabaseServiceRoleKey) {
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY not configured. Admin operations will use anon key. ' +
    'Set SUPABASE_SERVICE_ROLE_KEY in .env.local for production.'
  );
  supabaseAdminClient = supabasePublic;
}
export const supabaseAdmin: SupabaseClient = supabaseAdminClient;

// ─── Backward Compatibility ─────────────────────────────────
// Legacy export — used by existing code, points to public client
export const supabase = supabasePublic;
