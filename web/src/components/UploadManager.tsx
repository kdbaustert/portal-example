'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ProgressBar } from 'react-bootstrap';
import { api, errorMessage, isStatus } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { PortalDocument } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { extensionOf, FileIcon } from './Bits';
import { Dropzone } from './Dropzone';

type Status = 'checking' | 'decide' | 'uploading' | 'done' | 'skipped' | 'error';

type Item = {
  key: string;
  file: File;
  status: Status;
  progress: number;
  match?: PortalDocument;
  result?: PortalDocument;
  asVersion?: boolean;
  message?: string;
};

/**
 * Drop one or more files. Each file whose name matches an existing
 * document's current file asks whether to add it as the next version of that
 * document or start a new document; everything else becomes a new document.
 */
export function UploadManager({ clientId, onUploaded }: { clientId?: number | ''; onUploaded?: (doc: PortalDocument) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const needsClient = !!user?.is_admin && !clientId;

  const patch = useCallback((key: string, changes: Partial<Item>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }, []);

  const asNewDocument = useCallback(
    async (item: Item) => {
      patch(item.key, { status: 'uploading', progress: 0, asVersion: false });
      try {
        const doc = await api.createDocument(
          { file: item.file, client_id: user?.is_admin ? Number(clientId) : undefined },
          (p) => patch(item.key, { progress: p }),
        );
        patch(item.key, { status: 'done', result: doc, progress: 100 });
        onUploaded?.(doc);
      } catch (err) {
        patch(item.key, { status: 'error', message: errorMessage(err) });
      }
    },
    [clientId, onUploaded, patch, user?.is_admin],
  );

  const asNewVersion = useCallback(
    async (item: Item, doc: PortalDocument) => {
      patch(item.key, { status: 'uploading', progress: 0, asVersion: true });
      try {
        const updated = await api.uploadVersion(doc.id, item.file, undefined, (p) => patch(item.key, { progress: p }));
        patch(item.key, { status: 'done', result: updated, progress: 100 });
        onUploaded?.(updated);
      } catch (err) {
        if (isStatus(err, 409)) patch(item.key, { status: 'skipped', message: errorMessage(err), result: doc });
        else patch(item.key, { status: 'error', message: errorMessage(err) });
      }
    },
    [onUploaded, patch],
  );

  const addFiles = (files: File[]) => {
    const fresh: Item[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      status: 'checking',
      progress: 0,
    }));
    setItems((list) => [...fresh, ...list]);

    fresh.forEach(async (item) => {
      try {
        const res = await api.documents({ filename: item.file.name, per_page: 1, client_id: user?.is_admin ? clientId : undefined });
        const match = res.data[0];
        if (match) patch(item.key, { status: 'decide', match });
        else asNewDocument(item);
      } catch (err) {
        patch(item.key, { status: 'error', message: errorMessage(err) });
      }
    });
  };

  const finished = items.filter((i) => ['done', 'skipped', 'error'].includes(i.status)).length;

  return (
    <div>
      <Dropzone onFiles={addFiles} disabled={needsClient}>
        {needsClient ? (
          <>
            <div className="dz-icon">
              <i className="bi bi-buildings" />
            </div>
            <div className="fw-semibold text-ink">Choose a client first</div>
            <small className="text-muted">Admins upload on behalf of a client.</small>
          </>
        ) : undefined}
      </Dropzone>

      {items.length > 0 && (
        <div className="upload-queue mt-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small-caps">Uploads</span>
            {finished > 0 && (
              <button className="btn btn-link btn-sm p-0" onClick={() => setItems((l) => l.filter((i) => !['done', 'skipped', 'error'].includes(i.status)))}>
                Clear finished
              </button>
            )}
          </div>
          {items.map((item) => (
            <div className="upload-item" key={item.key}>
              <FileIcon ext={extensionOf(item.file.name)} />
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex justify-content-between gap-2">
                  <span className="fw-semibold text-truncate">{item.file.name}</span>
                  <small className="text-muted text-nowrap">{formatBytes(item.file.size)}</small>
                </div>

                {item.status === 'checking' && <small className="text-muted">Checking for an existing document…</small>}

                {item.status === 'decide' && item.match && (
                  <div className="mt-1">
                    <small className="text-muted d-block mb-2">
                      <strong className="text-ink">{item.match.name}</strong> already has this file name (currently v{item.match.latest_version}).
                    </small>
                    <div className="d-flex gap-2 flex-wrap">
                      <button className="btn btn-primary btn-sm" onClick={() => asNewVersion(item, item.match!)}>
                        <i className="bi bi-layers me-1" />
                        Save as v{item.match.latest_version + 1}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => asNewDocument(item)}>
                        New document
                      </button>
                      <button className="btn btn-link btn-sm text-muted" onClick={() => setItems((l) => l.filter((i) => i.key !== item.key))}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {item.status === 'uploading' && <ProgressBar now={item.progress} animated={item.progress >= 100} />}

                {item.status === 'done' && item.result && (
                  <small className="text-success">
                    <i className="bi bi-check-circle-fill me-1" />
                    {item.asVersion ? `Saved as v${item.result.latest_version} of ` : 'Created '}
                    <Link href={`/documents/${item.result.id}`}>{item.result.name}</Link>
                  </small>
                )}

                {item.status === 'skipped' && (
                  <small className="text-muted">
                    <i className="bi bi-dash-circle me-1" />
                    {item.message} Nothing was changed.
                  </small>
                )}

                {item.status === 'error' && (
                  <small className="text-danger">
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    {item.message}
                  </small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
