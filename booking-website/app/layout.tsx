import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
  title: 'Ενοικιάσεις Αυτοκινήτων | Car Rentals',
  description: 'Κλείστε το αυτοκίνητό σας online εύκολα και γρήγορα',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

