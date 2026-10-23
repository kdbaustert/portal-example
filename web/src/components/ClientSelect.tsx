'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

/** Admin-only picker for which client a list or upload belongs to. */
export function ClientSelect({
  value,
  onChange,
  allLabel = 'All clients',
  size,
}: {
  value: number | '';
  onChange: (id: number | '') => void;
  allLabel?: string;
  size?: 'sm';
}) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    api.clients().then(setClients).catch(() => setClients([]));
  }, []);

  return (
    <select
      className={`form-select ${size ? `form-select-${size}` : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      aria-label="Client"
      style={{ minWidth: 200, width: 'auto' }}
    >
      <option value="">{allLabel}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
