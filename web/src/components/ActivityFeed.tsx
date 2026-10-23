'use client';

import Link from 'next/link';
import type { Activity } from '@/lib/types';
import { timeAgo, formatDate } from '@/lib/format';
import { EmptyState } from './Bits';

const look: Record<string, { icon: string; tone: string }> = {
  created: { icon: 'bi-file-earmark-plus', tone: 'soft-primary' },
  uploaded: { icon: 'bi-cloud-arrow-up', tone: 'soft-primary' },
  restored: { icon: 'bi-arrow-counterclockwise', tone: 'soft-info' },
  downloaded: { icon: 'bi-download', tone: 'soft-success' },
  archived: { icon: 'bi-archive', tone: 'soft-warning' },
  unarchived: { icon: 'bi-box-arrow-up', tone: 'soft-warning' },
  renamed: { icon: 'bi-pencil', tone: 'soft-info' },
};

function describe(a: Activity) {
  const v = a.meta.version ? <span className="version-pill is-muted mx-1">v{a.meta.version}</span> : null;
  switch (a.action) {
    case 'created':
      return <>created</>;
    case 'uploaded':
      return a.meta.version === 1 ? <>uploaded {v}</> : <>uploaded a new version {v}</>;
    case 'restored':
      return (
        <>
          restored v{a.meta.restored_from_version} as {v}
        </>
      );
    case 'downloaded':
      return <>downloaded {v}</>;
    case 'renamed':
      return <>edited the details of</>;
    default:
      return <>{a.action}</>;
  }
}

export function ActivityFeed({ items, showDocument = true, showClient = false }: { items: Activity[]; showDocument?: boolean; showClient?: boolean }) {
  // "created" is always followed by "uploaded v1"; hide the noise.
  const visible = items.filter((a) => a.action !== 'created');
  if (!visible.length) return <EmptyState icon="bi-clock-history" title="No activity yet" />;

  return (
    <ul className="activity-feed">
      {visible.map((a) => {
        const l = look[a.action] ?? { icon: 'bi-dot', tone: 'soft-primary' };
        return (
          <li key={a.id}>
            <span className={`act-icon ${l.tone}`}>
              <i className={`bi ${l.icon}`} />
            </span>
            <div className="flex-grow-1 min-w-0">
              <div>
                <span className="fw-semibold">{a.user?.name ?? 'Someone'}</span> {describe(a)}
                {showDocument && a.document_id && (
                  <>
                    {' '}
                    <Link href={`/documents/${a.document_id}`} className="doc-link">
                      {a.meta.document_name ?? 'a document'}
                    </Link>
                  </>
                )}
              </div>
              <time dateTime={a.created_at} title={formatDate(a.created_at, true)}>
                {timeAgo(a.created_at)}
                {showClient && a.client && <> · {a.client.name}</>}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
