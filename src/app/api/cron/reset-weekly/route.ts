import { NextResponse } from 'next/server';
import { deleteAllBookings } from '@/lib/store';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Pastikan CRON_SECRET dikonfigurasi di environment
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured in the environment.');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    // Verifikasi header Authorization: Bearer <CRON_SECRET>
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request attempt.');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Executing automated weekly reset (Vercel Cron)...');
    
    // Hapus semua data peminjaman
    const ok = await deleteAllBookings();
    
    if (!ok) {
      console.error('Failed to delete bookings during cron execution.');
      return NextResponse.json({ success: false, message: 'Failed to clear database' }, { status: 500 });
    }

    // Revalidate halaman utama agar UI langsung terupdate
    revalidatePath('/');
    
    console.log('Automated weekly reset completed successfully.');
    return NextResponse.json({ success: true, message: 'Weekly reset completed' }, { status: 200 });
  } catch (error) {
    console.error('Error during cron execution:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
