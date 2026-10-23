'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { DashboardData, PortalDocument } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { ActivityFeed } from '@/components/ActivityFeed';
import { EmptyState, PageHeader } from '@/components/Bits';
import { ClientSelect } from '@/components/ClientSelect';
import { DocumentsTable } from '@/components/DocumentsTable';
import { UploadManager } from '@/components/UploadManager';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<PortalDocument[] | null>(null);
  const [clientId, setClientId] = useState<number | ''>('');

  const load = useCallback(() => {
    api.dashboard().then(setData);
    api.documents({ per_page: 6 }).then((r) => setRecent(r.data));
  }, []);

  useEffect(load, [load]);

  const firstName = user?.name.split(' ')[0];
  const stats = data?.stats;
  const cards = [
    { label: 'Documents', value: stats?.documents, icon: 'bi-folder2', tone: 'soft-primary' },
    { label: 'Versions stored', value: stats?.versions, icon: 'bi-layers', tone: 'soft-info' },
    { label: 'Uploads, last 30 days', value: stats?.uploads_30d, icon: 'bi-cloud-arrow-up', tone: 'soft-success' },
    { label: 'Storage used', value: stats ? formatBytes(stats.storage_bytes) : undefined, icon: 'bi-hdd', tone: 'soft-warning' },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={user?.is_admin ? 'Files across every client workspace.' : `${user?.client?.name} · shared files and their history`}
      />

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card stat-card h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <span className={`stat-icon ${c.tone}`}>
                  <i className={`bi ${c.icon}`} />
                </span>
                <div>
                  <div className="stat-value">{c.value ?? <span className="placeholder col-6" />}</div>
                  <small className="text-muted">{c.label}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h2 className="card-title-sm">Upload files</h2>
              {user?.is_admin && <ClientSelect value={clientId} onChange={setClientId} allLabel="Upload for client…" size="sm" />}
            </div>
            <div className="card-body">
              <UploadManager clientId={clientId} onUploaded={load} />
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="card-title-sm">Recently updated</h2>
              <Link href="/documents" className="small">
                All documents <i className="bi bi-arrow-right" />
              </Link>
            </div>
            {recent === null ? (
              <div className="card-body placeholder-glow">
                <span className="placeholder col-12 mb-2" />
                <span className="placeholder col-10" />
              </div>
            ) : recent.length ? (
              <DocumentsTable docs={recent} showClient={user?.is_admin} />
            ) : (
              <EmptyState icon="bi-folder2-open" title="No documents yet">
                Drop a file above to create your first one.
              </EmptyState>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="card-title-sm">Recent activity</h2>
              <Link href="/activity" className="small">
                View all
              </Link>
            </div>
            <div className="card-body">
              {data ? <ActivityFeed items={data.recent_activity} showClient={user?.is_admin} /> : <div className="placeholder-glow"><span className="placeholder col-12" /></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
