'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Client, PortalDocument } from '@/lib/types';
import { Avatar, EmptyState, PageHeader } from '@/components/Bits';
import { DocumentsTable } from '@/components/DocumentsTable';
import { useToast } from '@/components/Toasts';
import { UploadManager } from '@/components/UploadManager';
import { ConfirmModal } from '@/components/Modals';

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [docs, setDocs] = useState<PortalDocument[] | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(() => {
    api.client(id).then(setClient);
    api.documents({ client_id: Number(id), per_page: 50 }).then((r) => setDocs(r.data));
  }, [id]);

  useEffect(load, [load]);

  const addUser = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const u = await api.createClientUser(Number(id), form);
      toast(`${u.name} can now sign in.`);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!client) return <div className="placeholder-glow"><span className="placeholder col-6" /></div>;

  return (
    <>
      <nav className="mb-3">
        <Link href="/admin/clients" className="small text-muted">
          <i className="bi bi-arrow-left me-1" />
          Clients
        </Link>
      </nav>
      <PageHeader title={client.name} subtitle={`${client.contact_email ?? 'No contact email'} · client since ${formatDate(client.created_at)}`} />

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="card-title-sm">Upload on behalf of {client.name}</h2>
            </div>
            <div className="card-body">
              <UploadManager clientId={client.id} onUploaded={load} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title-sm">Documents ({client.documents_count})</h2>
            </div>
            {docs?.length ? <DocumentsTable docs={docs} /> : <EmptyState icon="bi-folder2-open" title="No documents yet" />}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="card-title-sm">Users ({client.users?.length ?? 0})</h2>
            </div>
            <ul className="list-group list-group-flush">
              {client.users?.map((u) => (
                <li key={u.id} className="list-group-item d-flex align-items-center gap-2">
                  <Avatar name={u.name} />
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-truncate">{u.name}</div>
                    <small className="text-muted text-truncate d-block">{u.email}</small>
                  </div>
                  <button className="btn btn-sm btn-link text-danger" title="Remove access" onClick={() => setRemoving({ id: u.id, name: u.name })}>
                    <i className="bi bi-person-dash" />
                  </button>
                </li>
              ))}
              {!client.users?.length && <li className="list-group-item text-muted small">No users yet.</li>}
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title-sm">Add a user</h2>
            </div>
            <form className="card-body" onSubmit={addUser}>
              <input className="form-control mb-2" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="form-control mb-2" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input
                className="form-control mb-2"
                type="text"
                placeholder="Temporary password (10+ characters)"
                required
                minLength={10}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <button className="btn btn-primary w-100">Add user</button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={!!removing}
        title="Remove access?"
        body={<p className="mb-0">{removing?.name} will no longer be able to sign in. Files they uploaded stay in place.</p>}
        confirmLabel="Remove user"
        variant="danger"
        onHide={() => setRemoving(null)}
        onConfirm={async () => {
          await api.deleteClientUser(client.id, removing!.id);
          setRemoving(null);
          toast('User removed.');
          load();
        }}
      />
    </>
  );
}
