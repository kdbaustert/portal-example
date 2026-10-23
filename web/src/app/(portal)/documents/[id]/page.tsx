'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Nav } from 'react-bootstrap';
import { api, errorMessage } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import type { Activity, PortalDocument, Version } from '@/lib/types';
import { ActivityFeed } from '@/components/ActivityFeed';
import { EmptyState, FileIcon } from '@/components/Bits';
import { ConfirmModal, EditDocumentModal, NewVersionModal, RestoreModal } from '@/components/Modals';
import { useToast } from '@/components/Toasts';
import { VersionTimeline } from '@/components/VersionTimeline';

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [doc, setDoc] = useState<PortalDocument | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'history' | 'activity'>('history');

  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState<Version | null>(null);

  const loadActivity = useCallback(() => {
    api.documentActivity(id).then(setActivity).catch(() => setActivity([]));
  }, [id]);

  useEffect(() => {
    api
      .document(id)
      .then(setDoc)
      .catch((e) => setError(errorMessage(e)));
    loadActivity();
  }, [id, loadActivity]);

  const updated = (next: PortalDocument, message: string) => {
    setDoc(next);
    loadActivity();
    toast(message);
  };

  if (error) {
    return (
      <div className="card">
        <EmptyState icon="bi-file-earmark-x" title="Can’t open this document">
          <p className="mb-3">{error}</p>
          <Link href="/documents" className="btn btn-outline-secondary btn-sm">
            Back to documents
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-4 mb-3" style={{ height: 32 }} />
        <span className="placeholder col-12" style={{ height: 300 }} />
      </div>
    );
  }

  const current = doc.current_version;
  const archived = !!doc.archived_at;

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3">
        <Link href="/documents" className="small text-muted">
          <i className="bi bi-arrow-left me-1" />
          Documents
        </Link>
      </nav>

      {archived && (
        <div className="alert alert-warning d-flex align-items-center gap-3">
          <i className="bi bi-archive fs-5" />
          <div className="flex-grow-1">
            Archived {formatDate(doc.archived_at!)}. Its history is kept and every version can still be downloaded.
          </div>
          <button
            className="btn btn-sm btn-warning"
            onClick={async () => {
              try {
                updated(await api.unarchiveDocument(doc.id), 'Document restored from the archive.');
              } catch (e) {
                toast(errorMessage(e), 'danger');
              }
            }}
          >
            Unarchive
          </button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body d-flex gap-3 align-items-start flex-wrap">
          <FileIcon ext={current?.extension ?? ''} large />
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="h3 mb-0">{doc.name}</h1>
              <span className="version-pill">v{doc.latest_version}</span>
            </div>
            {doc.description && <p className="text-muted mb-0 mt-1">{doc.description}</p>}
            <div className="small text-muted mt-2 d-flex gap-3 flex-wrap">
              {doc.client && (
                <span>
                  <i className="bi bi-buildings me-1" />
                  {doc.client.name}
                </span>
              )}
              {current && (
                <span>
                  <i className="bi bi-paperclip me-1" />
                  {current.original_name} · {formatBytes(current.size)}
                </span>
              )}
              <span>
                <i className="bi bi-calendar3 me-1" />
                Created {formatDate(doc.created_at)}
                {doc.created_by && ` by ${doc.created_by.name}`}
              </span>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {current && (
              <a className="btn btn-outline-secondary" href={current.download_url}>
                <i className="bi bi-download me-2" />
                Download
              </a>
            )}
            {!archived && (
              <>
                <button className="btn btn-primary" onClick={() => setUploading(true)}>
                  <i className="bi bi-cloud-arrow-up me-2" />
                  New version
                </button>
                <button className="btn btn-light" aria-label="Edit details" title="Edit details" onClick={() => setEditing(true)}>
                  <i className="bi bi-pencil" />
                </button>
                <button className="btn btn-light" title="Archive" aria-label="Archive" onClick={() => setArchiving(true)}>
                  <i className="bi bi-archive" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header pb-0 border-bottom-0">
          <Nav variant="underline" activeKey={tab} onSelect={(k) => setTab(k as typeof tab)}>
            <Nav.Item>
              <Nav.Link eventKey="history">
                Version history <span className="badge text-bg-light ms-1">{doc.versions?.length ?? 0}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="activity">Activity</Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        <div className="card-body pt-4">
          {tab === 'history' ? (
            <VersionTimeline versions={doc.versions ?? []} readOnly={archived} onRestore={setRestoring} />
          ) : activity ? (
            <ActivityFeed items={activity} showDocument={false} />
          ) : null}
        </div>
      </div>

      <NewVersionModal
        doc={doc}
        show={uploading}
        onHide={() => setUploading(false)}
        onSaved={(d) => {
          setUploading(false);
          updated(d, `Saved as version ${d.latest_version}.`);
        }}
      />
      <RestoreModal
        doc={doc}
        version={restoring}
        onHide={() => setRestoring(null)}
        onRestored={(d) => {
          setRestoring(null);
          updated(d, `Version ${d.current_version?.restored_from_version} restored as v${d.latest_version}.`);
        }}
      />
      <EditDocumentModal
        doc={doc}
        show={editing}
        onHide={() => setEditing(false)}
        onSaved={(d) => {
          setEditing(false);
          updated(d, 'Details saved.');
        }}
      />
      <ConfirmModal
        show={archiving}
        title="Archive this document?"
        body={
          <p className="mb-0">
            <strong>{doc.name}</strong> moves to the archive. Nothing is deleted: all {doc.latest_version} version
            {doc.latest_version === 1 ? '' : 's'} stay downloadable and you can unarchive it any time.
          </p>
        }
        confirmLabel="Archive"
        variant="warning"
        onHide={() => setArchiving(false)}
        onConfirm={async () => {
          try {
            await api.archiveDocument(doc.id);
            toast('Document archived.');
            router.push('/documents');
          } catch (e) {
            toast(errorMessage(e), 'danger');
            setArchiving(false);
          }
        }}
      />
    </>
  );
}
