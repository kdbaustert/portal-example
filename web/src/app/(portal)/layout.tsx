'use client';

import { RequireAuth } from '@/components/AuthProvider';
import { AppShell } from '@/components/AppShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
