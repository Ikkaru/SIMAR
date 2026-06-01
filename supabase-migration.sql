-- ============================================================
-- SIMAR — Database Migration Script
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. Tabel admin_sessions (untuk session-based auth) ─────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk lookup token yang cepat
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- Auto-cleanup expired sessions (opsional, jalankan via Supabase CRON)
-- DELETE FROM admin_sessions WHERE expires_at < now();

-- ─── 2. Pastikan tabel bookings memiliki kolom yang diperlukan ─
-- Jika tabel sudah ada, tambahkan kolom yang mungkin belum ada:
ALTER TABLE bookings
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ─── 3. Unique constraint untuk mencegah double booking ─────
-- Constraint ini memastikan hanya ada satu booking aktif per slot
-- (pending atau approved, bukan rejected)
-- Catatan: PostgreSQL partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_booking_slot
  ON bookings (day, session, room)
  WHERE status IN ('pending', 'approved');

-- ─── 4. Row Level Security (RLS) ────────────────────────────

-- 4a. Aktifkan RLS pada semua tabel
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE locked_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- 4b. Policy untuk tabel bookings
-- Semua orang bisa membaca bookings (untuk jadwal publik)
CREATE POLICY "bookings_select_all" ON bookings
  FOR SELECT USING (true);

-- Semua orang bisa insert booking baru (submit booking)
CREATE POLICY "bookings_insert_all" ON bookings
  FOR INSERT WITH CHECK (true);

-- Hanya service role yang bisa update (approve/reject)
CREATE POLICY "bookings_update_service" ON bookings
  FOR UPDATE USING (auth.role() = 'service_role');

-- Hanya service role yang bisa delete
CREATE POLICY "bookings_delete_service" ON bookings
  FOR DELETE USING (auth.role() = 'service_role');

-- 4c. Policy untuk tabel locked_slots
CREATE POLICY "locked_slots_select_all" ON locked_slots
  FOR SELECT USING (true);

CREATE POLICY "locked_slots_modify_service" ON locked_slots
  FOR ALL USING (auth.role() = 'service_role');

-- 4d. Policy untuk tabel locked_rooms
CREATE POLICY "locked_rooms_select_all" ON locked_rooms
  FOR SELECT USING (true);

CREATE POLICY "locked_rooms_modify_service" ON locked_rooms
  FOR ALL USING (auth.role() = 'service_role');

-- 4e. Policy untuk admin_sessions (hanya service role)
CREATE POLICY "admin_sessions_service_only" ON admin_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 5. Stored Procedure untuk Atomic Booking (mencegah race condition) ─
CREATE OR REPLACE FUNCTION submit_booking_atomic(
  p_id TEXT,
  p_day TEXT,
  p_session INT,
  p_room TEXT,
  p_duration INT,
  p_nama_pj TEXT,
  p_nim TEXT,
  p_nama_matakuliah TEXT,
  p_dosen_pengampu TEXT
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflict_count INT;
  v_result JSON;
BEGIN
  -- Lock rows yang mungkin conflict (advisory lock per room-day)
  PERFORM pg_advisory_xact_lock(hashtext(p_day || '-' || p_room));
  
  -- Cek apakah ada booking aktif yang conflict
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE day = p_day
    AND room = p_room
    AND status IN ('pending', 'approved')
    AND (
      -- Booking existing yang overlap dengan range baru
      (session <= p_session + p_duration - 1)
      AND (session + "durasiPemakaian" - 1 >= p_session)
    );
  
  IF v_conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Slot sudah terisi oleh booking lain.'
    );
  END IF;
  
  -- Insert booking baru
  INSERT INTO bookings (id, day, session, room, "namaPJ", nim, "durasiPemakaian", "namaMatakuliah", "dosenPengampu", status, "createdAt")
  VALUES (p_id, p_day, p_session, p_room, p_nama_pj, p_nim, p_duration, p_nama_matakuliah, p_dosen_pengampu, 'pending', now());
  
  RETURN json_build_object(
    'success', true,
    'message', 'Booking berhasil diajukan.',
    'id', p_id
  );
  
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Slot sudah terisi (constraint violation).'
  );
END;
$$;

-- ─── Selesai ─────────────────────────────────────────────────
-- Pastikan untuk:
-- 1. Menjalankan SQL ini di Supabase SQL Editor
-- 2. Mengisi SUPABASE_SERVICE_ROLE_KEY di .env.local
-- 3. Mengisi ADMIN_PASSWORD_HASH di .env.local
