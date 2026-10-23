'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from 'react-bootstrap';
import { api, errorMessage } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import type { Client } from '@/lib/types';
import { EmptyState, PageHeader } from '@/components/Bits';
import { useToast } from '@/components/Toasts';

export default function ClientsPage() {
  const router = useRouter();
  const toast = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.clients().then(setClients);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const c = await api.createClient({ name, contact_email: email || undefined });
      toast(`${c.name} created. Add their first user next.`);
      router.push(`/admin/clients/${c.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Each client has a private workspace. Their users only ever see their own files."
        actions={
          <button className="btn btn-primary" onClick={() => setShow(true)}>
            <i className="bi bi-plus-lg me-2" />
            New client
          </button>
        }
      />

      <div className="card">
        {clients === null ? (
          <div className="card-body placeholder-glow">
            <span className="placeholder col-12" />
          </div>
        ) : clients.length ? (
          <div className="table-responsive">
            <table className="table table-portal">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Users</th>
                  <th>Documents</th>
                  <th>Storage</th>
                  <th className="d-none d-md-table-cell">Since</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/admin/clients/${c.id}`)}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`} className="doc-link">
                        {c.name}
                      </Link>
                      <small className="d-block text-muted">{c.contact_email ?? c.slug}</small>
                    </td>
                    <td>{c.users_count}</td>
                    <td>{c.documents_count}</td>
                    <td className="text-muted">{formatBytes(c.storage_bytes ?? 0)}</td>
                    <td className="d-none d-md-table-cell text-muted">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="bi-buildings" title="No clients yet" />
        )}
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <form onSubmit={create}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">New client</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label className="form-label" htmlFor="client-name">
              Company name
            </label>
            <input id="client-name" className="form-control mb-3" required value={name} onChange={(e) => setName(e.target.value)} />
            <label className="form-label" htmlFor="client-email">
              Contact email <span className="text-muted fw-normal">(optional)</span>
            </label>
            <input id="client-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light" onClick={() => setShow(false)}>
              Cancel
            </button>
            <button className="btn btn-primary">Create client</button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}
