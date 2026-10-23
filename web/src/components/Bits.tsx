'use client';

import type { ReactNode } from 'react';
import { avatarColor, initials } from '@/lib/format';

const groups: Record<string, string[]> = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages'],
  sheet: ['xls', 'xlsx', 'csv', 'ods', 'numbers', 'tsv'],
  slides: ['ppt', 'pptx', 'key', 'odp'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'tif', 'tiff', 'psd', 'ai', 'bmp'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
};

const filetypeIcons = new Set([
  'aac', 'ai', 'bmp', 'csv', 'doc', 'docx', 'gif', 'heic', 'html', 'jpg', 'json', 'key', 'md', 'mov', 'mp3', 'mp4',
  'pdf', 'png', 'ppt', 'pptx', 'psd', 'svg', 'tiff', 'txt', 'wav', 'xls', 'xlsx', 'xml',
]);

export function extensionOf(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function FileIcon({ ext, large = false }: { ext: string; large?: boolean }) {
  const e = ext.toLowerCase();
  const group = Object.entries(groups).find(([, list]) => list.includes(e))?.[0];
  const icon = filetypeIcons.has(e) ? `bi-filetype-${e}` : group === 'archive' ? 'bi-file-earmark-zip' : 'bi-file-earmark';
  return (
    <span className={`file-icon ${group ? `ft-${group}` : ''} ${large ? 'file-icon-lg' : ''}`} aria-hidden>
      <i className={`bi ${icon}`} />
    </span>
  );
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'avatar-sm' : ''}`} style={{ background: avatarColor(name) }} title={name}>
      {initials(name)}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} />
      <div className="fw-semibold text-ink mb-1">{title}</div>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Pager({ page, last, onPage }: { page: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null;
  return (
    <nav className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
      <small className="text-muted">
        Page {page} of {last}
      </small>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <i className="bi bi-chevron-left" /> Prev
        </button>
        <button className="btn btn-outline-secondary" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Next <i className="bi bi-chevron-right" />
        </button>
      </div>
    </nav>
  );
}
