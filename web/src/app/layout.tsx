import type { Metadata } from 'next';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/globals.scss';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/Toasts';

export const metadata: Metadata = {
  title: { default: 'Portal Example', template: '%s · Portal Example' },
  description: 'Share files with your team and keep every version.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
