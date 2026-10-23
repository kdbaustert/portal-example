'use client';

import type { Version } from '@/lib/types';
import { formatBytes, formatDate, timeAgo } from '@/lib/format';
import { Avatar } from './Bits';

function SizeDelta({ now, before }: { now: number; before?: number }) {
  if (before === undefined || before === now) return null;
  const diff = now - before;
  return (
    <span className={`size-delta ${diff > 0 ? 'up' : 'down'}`} title="Change from the previous version">
      {diff > 0 ? '+' : '−'}
      {formatBytes(Math.abs(diff))}
    </span>
  );
}

export function VersionTimeline({
  versions,
  readOnly,
  onRestore,
}: {
  versions: Version[];
  readOnly?: boolean;
  onRestore: (v: Version) => void;
}) {
  return (
    <ol className="version-timeline">
      {versions.map((v, i) => {
        const previous = versions[i + 1];
        const renamed = previous && previous.original_name !== v.original_name;
        return (
          <li key={v.id} className={`${v.is_current ? 'is-current' : ''} ${v.restored_from_version ? 'is-restore' : ''}`}>
            <span className="tl-dot">v{v.version}</span>
            <div className="tl-card">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-semibold text-ink">Version {v.version}</span>
                    {v.is_current && <span className="badge text-bg-primary">Current</span>}
                    {v.restored_from_version && (
                      <span className="badge soft-info">
                        <i className="bi bi-arrow-counterclockwise me-1" />
                        Restored from v{v.restored_from_version}
                      </span>
                    )}
                  </div>
                  <div className="tl-meta mt-1 d-flex align-items-center gap-2 flex-wrap">
                    {v.uploaded_by && (
                      <span className="d-inline-flex align-items-center gap-1">
                        <Avatar name={v.uploaded_by.name} small /> {v.uploaded_by.name}
                      </span>
                    )}
                    <span title={formatDate(v.created_at, true)}>{timeAgo(v.created_at)}</span>
                    <span>·</span>
                    <span>{formatBytes(v.size)}</span>
                    <SizeDelta now={v.size} before={previous?.size} />
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <a className="btn btn-sm btn-outline-secondary" href={v.download_url} title={`Download ${v.original_name}`}>
                    <i className="bi bi-download" />
                    <span className="d-none d-sm-inline ms-1">Download</span>
                  </a>
                  {!v.is_current && !readOnly && (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onRestore(v)}>
                      <i className="bi bi-arrow-counterclockwise" />
                      <span className="d-none d-sm-inline ms-1">Restore</span>
                    </button>
                  )}
                </div>
              </div>

              {v.note && <p className="tl-note">{v.note}</p>}

              <div className="d-flex gap-3 flex-wrap mt-2 small">
                <span className="text-muted text-truncate">
                  <i className="bi bi-paperclip me-1" />
                  {v.original_name}
                  {renamed && <span className="ms-1 badge text-bg-light">renamed</span>}
                </span>
                <span className="checksum" title={`SHA-256 ${v.checksum}`}>
                  sha256 {v.checksum.slice(0, 12)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
