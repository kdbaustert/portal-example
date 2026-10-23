'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Modal, ProgressBar } from 'react-bootstrap';
import { api, errorMessage } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { PortalDocument, Version } from '@/lib/types';
import { extensionOf, FileIcon } from './Bits';
import { Dropzone } from './Dropzone';

export function NewVersionModal({
  doc,
  show,
  onHide,
  onSaved,
}: {
  doc: PortalDocument;
  show: boolean;
  onHide: () => void;
  onSaved: (doc: PortalDocument) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setFile(null);
      setNote('');
      setProgress(null);
      setError('');
    }
  }, [show]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      onSaved(await api.uploadVersion(doc.id, file, note, setProgress));
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered>
      <form onSubmit={submit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h5">Upload version {doc.latest_version + 1}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {file ? (
            <div className="d-flex align-items-center gap-3 border rounded p-3">
              <FileIcon ext={extensionOf(file.name)} />
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate">{file.name}</div>
                <small className="text-muted">{formatBytes(file.size)}</small>
              </div>
              {!busy && (
                <button type="button" className="btn btn-sm btn-link" onClick={() => setFile(null)}>
                  Change
                </button>
              )}
            </div>
          ) : (
            <Dropzone multiple={false} compact onFiles={(f) => setFile(f[0] ?? null)}>
              <div className="fw-semibold text-ink">
                <i className="bi bi-cloud-arrow-up me-2 text-primary" />
                Choose the updated file
              </div>
              <small className="text-muted">Version {doc.latest_version} stays in the history.</small>
            </Dropzone>
          )}

          <label className="form-label mt-3" htmlFor="version-note">
            What changed? <span className="text-muted fw-normal">(optional)</span>
          </label>
          <textarea
            id="version-note"
            className="form-control"
            rows={3}
            maxLength={500}
            placeholder="e.g. Updated pricing on page 3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />

          {busy && <ProgressBar className="mt-3" now={progress ?? 0} label={`${progress}%`} visuallyHidden />}
          {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!file || busy}>
            {busy ? `Uploading ${progress}%` : `Save as v${doc.latest_version + 1}`}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export function RestoreModal({
  doc,
  version,
  onHide,
  onRestored,
}: {
  doc: PortalDocument;
  version: Version | null;
  onHide: () => void;
  onRestored: (doc: PortalDocument) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNote('');
    setError('');
    setBusy(false);
  }, [version]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!version) return;
    setBusy(true);
    try {
      onRestored(await api.restoreVersion(doc.id, version.version, note));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal show={!!version} onHide={onHide} centered>
      <form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Restore version {version?.version}?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            A copy of v{version?.version} becomes <strong>v{doc.latest_version + 1}</strong> and the current file. Nothing is deleted:
            every version stays in the history.
          </p>
          <label className="form-label" htmlFor="restore-note">
            Reason <span className="text-muted fw-normal">(optional)</span>
          </label>
          <input
            id="restore-note"
            className="form-control"
            maxLength={500}
            placeholder={`Restored from version ${version?.version}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Restoring…' : `Restore as v${doc.latest_version + 1}`}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export function EditDocumentModal({
  doc,
  show,
  onHide,
  onSaved,
}: {
  doc: PortalDocument;
  show: boolean;
  onHide: () => void;
  onSaved: (doc: PortalDocument) => void;
}) {
  const [name, setName] = useState(doc.name);
  const [description, setDescription] = useState(doc.description ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) {
      setName(doc.name);
      setDescription(doc.description ?? '');
      setError('');
      setBusy(false);
    }
  }, [show, doc]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await api.updateDocument(doc.id, { name, description: description || null }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Edit details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="form-label" htmlFor="doc-name">
            Name
          </label>
          <input id="doc-name" className="form-control mb-3" required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="form-label" htmlFor="doc-desc">
            Description
          </label>
          <textarea id="doc-desc" className="form-control" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export function ConfirmModal({
  show,
  title,
  body,
  confirmLabel,
  variant = 'primary',
  onConfirm,
  onHide,
}: {
  show: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => Promise<void> | void;
  onHide: () => void;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <button className="btn btn-light" onClick={onHide}>
          Cancel
        </button>
        <button
          className={`btn btn-${variant}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
