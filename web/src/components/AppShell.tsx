'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Dropdown, Offcanvas } from 'react-bootstrap';
import { useAuth } from './AuthProvider';
import { Avatar } from './Bits';

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const main: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: 'bi-grid-1x2', exact: true },
    { href: '/documents', label: 'Documents', icon: 'bi-folder2-open' },
    { href: '/activity', label: 'Activity', icon: 'bi-clock-history' },
  ];
  const admin: NavItem[] = [{ href: '/admin/clients', label: 'Clients', icon: 'bi-buildings' }];

  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));
  const link = (i: NavItem) => (
    <Link key={i.href} href={i.href} className={`nav-link ${isActive(i) ? 'active' : ''}`} onClick={onNavigate}>
      <i className={`bi ${i.icon}`} /> {i.label}
    </Link>
  );

  return (
    <>
      <Link href="/" className="brand" onClick={onNavigate}>
        <span className="brand-mark">
          <i className="bi bi-stack" />
        </span>
        Portal Example
      </Link>
      <nav>{main.map(link)}</nav>
      {user?.is_admin && (
        <>
          <div className="nav-section">Admin</div>
          <nav>{admin.map(link)}</nav>
        </>
      )}
      <div className="sidebar-footer">
        <div className="text-white fw-semibold text-truncate">{user?.client?.name ?? 'Staff'}</div>
        <div className="small text-truncate" style={{ opacity: 0.6 }}>
          {user?.is_admin ? 'Administrator' : 'Client workspace'}
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/documents${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <Nav />
      </aside>

      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} className="portal-sidebar d-flex" style={{ width: 260 }}>
        <Nav onNavigate={() => setMenuOpen(false)} />
      </Offcanvas>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="btn btn-light mobile-nav" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <i className="bi bi-list" />
          </button>

          <form onSubmit={search} className="flex-grow-1" style={{ maxWidth: 420 }} role="search">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                className="form-control border-start-0 ps-0"
                placeholder="Search documents and file names"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search documents"
              />
            </div>
          </form>

          <Dropdown align="end" className="ms-auto">
            <Dropdown.Toggle variant="link" className="d-flex align-items-center gap-2 text-decoration-none text-body p-0" id="user-menu">
              <Avatar name={user?.name ?? '?'} />
              <span className="d-none d-md-inline fw-semibold">{user?.name}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.ItemText>
                <div className="fw-semibold">{user?.name}</div>
                <small className="text-muted">{user?.email}</small>
              </Dropdown.ItemText>
              <Dropdown.Divider />
              <Dropdown.Item onClick={signOut}>
                <i className="bi bi-box-arrow-right me-2" />
                Sign out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>

        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}
