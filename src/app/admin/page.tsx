import type { Metadata } from 'next';
import { verifyAdmin } from '@/lib/actions';
import AdminDashboard from '@/components/AdminDashboard';
import AdminLogin from '@/components/AdminLogin';

export const metadata: Metadata = {
  title: 'Admin Prodi — SIMAR | Sistem Informasi dan Booking Ruangan',
  description:
    'Dashboard Admin Prodi untuk meninjau dan mengelola permintaan booking ruangan Program Studi Informatika, Universitas Sebelas Maret.',
};

export default async function AdminPage() {
  const isAuth = await verifyAdmin();
  
  if (!isAuth) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}

