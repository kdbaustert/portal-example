export type Ref = { id: number; name: string };

export type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'client';
  is_admin: boolean;
  client?: Ref | null;
  created_at?: string;
};

export type Version = {
  id: number;
  version: number;
  original_name: string;
  extension: string;
  mime_type: string | null;
  size: number;
  checksum: string;
  note: string | null;
  restored_from_version: number | null;
  is_current?: boolean;
  uploaded_by?: Ref | null;
  download_url: string;
  created_at: string;
};

export type PortalDocument = {
  id: number;
  name: string;
  description: string | null;
  latest_version: number;
  versions_count?: number;
  client?: Ref;
  created_by?: Ref | null;
  current_version?: Version | null;
  versions?: Version[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: number;
  action: 'created' | 'uploaded' | 'restored' | 'downloaded' | 'archived' | 'unarchived' | 'renamed' | string;
  meta: {
    document_name?: string;
    version?: number;
    original_name?: string;
    restored_from_version?: number;
    name?: string;
  };
  user?: Ref | null;
  client?: Ref | null;
  document_id: number | null;
  created_at: string;
};

export type Client = {
  id: number;
  name: string;
  slug: string;
  contact_email: string | null;
  users_count?: number;
  documents_count?: number;
  storage_bytes?: number;
  users?: User[];
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
};

export type DashboardData = {
  stats: { documents: number; versions: number; storage_bytes: number; uploads_30d: number };
  recent_activity: Activity[];
};
