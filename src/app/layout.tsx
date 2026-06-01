import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import AnnouncementBanner from '@/components/AnnouncementBanner';

const pjs = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIMAR — Sistem Informasi dan Booking Ruangan | Prodi Informatika UNS',
  description:
    'Sistem Informasi dan Booking Ruangan (SIMAR) Program Studi Informatika, Fakultas Teknologi Informasi dan Sains Data, Universitas Sebelas Maret.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${pjs.variable} font-sans`}>
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <AnnouncementBanner />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

