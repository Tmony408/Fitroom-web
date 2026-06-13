import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'FitRoom — Custom Senator & Kaftan',
  description: 'AI fashion fitting and custom clothing for the African-fashion diaspora.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          <main className="wrap">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
