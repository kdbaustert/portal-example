'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PortalDocument } from '@/lib/types';
import { formatBytes, timeAgo, formatDate } from '@/lib/format';
import { Avatar, FileIcon } from './Bits';

export function DocumentsTable({ docs, showClient = false }: { docs: PortalDocument[]; showClient?: boolean }) {
  const router = useRouter();

  return (
    <div className="table-responsive">
      <table className="table table-portal">
        <thead>
          <tr>
            <th>Document</th>
            {showClient && <th className="d-none d-md-table-cell">Client</th>}
            <th>Version</th>
            <th className="d-none d-md-table-cell">Size</th>
            <th className="d-none d-lg-table-cell">Last change</th>
            <th aria-label="Download" />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => {
            const v = d.current_version;
            return (
              <tr key={d.id} onClick={() => router.push(`/documents/${d.id}`)}>
                <td>
                  <div className="d-flex align-items-center gap-3">
                    <FileIcon ext={v?.extension ?? ''} />
                    <div className="min-w-0">
                      <Link href={`/documents/${d.id}`} className="doc-link d-block text-truncate" onClick={(e) => e.stopPropagation()}>
                        {d.name}
                      </Link>
                      <small className="text-muted text-truncate d-block">{v?.original_name}</small>
                    </div>
                  </div>
                </td>
                {showClient && <td className="d-none d-md-table-cell text-nowrap">{d.client?.name}</td>}
                <td>
                  <span className="version-pill">v{d.latest_version}</span>
                  {d.archived_at && <span className="badge text-bg-warning ms-2">Archived</span>}
                </td>
                <td className="d-none d-md-table-cell text-muted text-nowrap">{v ? formatBytes(v.size) : '—'}</td>
                <td className="d-none d-lg-table-cell">
                  <div className="d-flex align-items-center gap-2 text-nowrap">
                    {v?.uploaded_by && <Avatar name={v.uploaded_by.name} small />}
                    <span className="text-muted" title={formatDate(d.updated_at, true)}>
                      {timeAgo(d.updated_at)}
                    </span>
                  </div>
                </td>
                <td className="text-end">
                  {v && (
                    <a
                      href={v.download_url}
                      className="btn btn-sm btn-light"
                      title={`Download v${v.version}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <i className="bi bi-download" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
