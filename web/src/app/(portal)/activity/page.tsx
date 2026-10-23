'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated, Activity } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { ActivityFeed } from '@/components/ActivityFeed';
import { PageHeader, Pager } from '@/components/Bits';

export default function ActivityPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Activity> | null>(null);

  useEffect(() => {
    api.activity(page).then(setResult);
  }, [page]);

  return (
    <>
      <PageHeader title="Activity" subtitle="Every upload, restore, download and change, newest first." />
      <div className="card">
        <div className="card-body">{result ? <ActivityFeed items={result.data} showClient={user?.is_admin} /> : <div className="placeholder-glow"><span className="placeholder col-12" /></div>}</div>
        {result && <Pager page={result.meta.current_page} last={result.meta.last_page} onPage={setPage} />}
      </div>
    </>
  );
}
