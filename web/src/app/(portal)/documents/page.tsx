'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Modal } from 'react-bootstrap';
import { api, errorMessage } from '@/lib/api';
import type { Paginated, PortalDocument } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { EmptyState, PageHeader, Pager } from '@/components/Bits';
import { ClientSelect } from '@/components/ClientSelect';
import { DocumentsTable } from '@/components/DocumentsTable';
import { UploadManager } from '@/components/UploadManager';

function DocumentsList() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = params.get('search') ?? '';
  const archived = params.get('archived') === '1';
  const sort = (params.get('sort') as 'updated' | 'name' | 'created') || 'updated';
  const page = Number(params.get('page') || 1);
  const clientId = params.get('client_id') ? Number(params.get('client_id')) : '';

  const [term, setTerm] = useState(search);
  const [result, setResult] = useState<Paginated<PortalDocument> | null>(null);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => setTerm(search), [search]);

  const setParams = useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, String(v))));
      if (!('page' in changes)) next.delete('page');
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const load = useCallback(() => {
    setError('');
    api
      .documents({ search, archived, sort, page, client_id: clientId })
      .then(setResult)
      .catch((e) => setError(errorMessage(e)));
  }, [search, archived, sort, page, clientId]);

  useEffect(load, [load]);

  // Debounce typing into the filter box.
  useEffect(() => {
    if (term === search) return;
    const t = setTimeout(() => setParams({ search: term.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [term, search, setParams]);

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle={result ? `${result.meta.total} ${archived ? 'archived ' : ''}document${result.meta.total === 1 ? '' : 's'}` : ' '}
        actions={
          !archived && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <i className="bi bi-cloud-arrow-up me-2" />
              Upload
            </button>
          )
        }
      />

      <div className="card">
        <div className="card-header d-flex gap-2 flex-wrap align-items-center">
          <div className="input-group" style={{ maxWidth: 320 }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-funnel text-muted" />
            </span>
            <input className="form-control" placeholder="Filter by name or file" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          {user?.is_admin && <ClientSelect value={clientId} onChange={(id) => setParams({ client_id: id || null })} />}
          <select className="form-select" style={{ width: 'auto' }} value={sort} onChange={(e) => setParams({ sort: e.target.value })} aria-label="Sort">
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="name">Name A–Z</option>
          </select>
          <div className="btn-group ms-auto" role="group" aria-label="Show">
            <button className={`btn btn-sm ${!archived ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setParams({ archived: null })}>
              Active
            </button>
            <button className={`btn btn-sm ${archived ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setParams({ archived: 1 })}>
              <i className="bi bi-archive me-1" />
              Archived
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger m-3">{error}</div>}

        {result === null ? (
          <div className="card-body placeholder-glow">
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-8" />
          </div>
        ) : result.data.length ? (
          <>
            <DocumentsTable docs={result.data} showClient={user?.is_admin} />
            <Pager page={result.meta.current_page} last={result.meta.last_page} onPage={(p) => setParams({ page: p })} />
          </>
        ) : (
          <EmptyState icon={archived ? 'bi-archive' : 'bi-search'} title={search ? `Nothing matches “${search}”` : archived ? 'No archived documents' : 'No documents yet'}>
            {!search && !archived && 'Upload a file to get started.'}
          </EmptyState>
        )}
      </div>

      <Modal show={showUpload} onHide={() => setShowUpload(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Upload files</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UploadUploader clientId={clientId} isAdmin={!!user?.is_admin} onUploaded={load} />
        </Modal.Body>
      </Modal>
    </>
  );
}

function UploadUploader({ clientId, isAdmin, onUploaded }: { clientId: number | ''; isAdmin: boolean; onUploaded: () => void }) {
  const [target, setTarget] = useState<number | ''>(clientId);
  return (
    <>
      {isAdmin && (
        <div className="mb-3">
          <label className="form-label">Client</label>
          <ClientSelect value={target} onChange={setTarget} allLabel="Choose a client…" />
        </div>
      )}
      <UploadManager clientId={target} onUploaded={onUploaded} />
    </>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsList />
    </Suspense>
  );
}
