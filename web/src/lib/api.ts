import axios, { AxiosError, type AxiosProgressEvent } from 'axios';
import type { Client, DashboardData, Paginated, PortalDocument, User, Activity } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

/**
 * Laravel Sanctum SPA auth: the browser keeps a session cookie for the API,
 * and axios echoes the XSRF-TOKEN cookie back in the X-XSRF-TOKEN header.
 */
export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

export async function csrf() {
  await http.get('/sanctum/csrf-cookie');
}

/** Pull a readable message out of a Laravel error response. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const firstField = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    if (firstField) return firstField;
    if (err.response?.status === 413) return 'That file is larger than the server accepts.';
    if (err.response?.status === 419) return 'Your session expired. Refresh the page and try again.';
    if (data?.message) return data.message;
    if (!err.response) return `Can't reach the API at ${API_URL}. Is it running?`;
  }
  return fallback;
}

export function isStatus(err: unknown, status: number) {
  return err instanceof AxiosError && err.response?.status === status;
}

type Progress = (percent: number) => void;
const progressHandler = (onProgress?: Progress) =>
  onProgress
    ? (e: AxiosProgressEvent) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
    : undefined;

export type DocumentQuery = {
  search?: string;
  client_id?: number | '';
  archived?: boolean;
  filename?: string;
  sort?: 'updated' | 'name' | 'created';
  page?: number;
  per_page?: number;
};

export const api = {
  // Auth
  async login(email: string, password: string, remember: boolean) {
    await csrf();
    return (await http.post<User>('/api/auth/login', { email, password, remember })).data;
  },
  me: async () => (await http.get<User>('/api/auth/user')).data,
  logout: async () => {
    await http.post('/api/auth/logout');
  },

  dashboard: async () => (await http.get<DashboardData>('/api/dashboard')).data,
  activity: async (page = 1) => (await http.get<Paginated<Activity>>('/api/activity', { params: { page } })).data,

  // Documents
  documents: async (query: DocumentQuery = {}) => {
    const params = Object.fromEntries(
      Object.entries({ ...query, archived: query.archived ? 1 : undefined }).filter(([, v]) => v !== '' && v !== undefined),
    );
    return (await http.get<Paginated<PortalDocument>>('/api/documents', { params })).data;
  },
  document: async (id: number | string) => (await http.get<PortalDocument>(`/api/documents/${id}`)).data,
  documentActivity: async (id: number | string) =>
    (await http.get<Activity[]>(`/api/documents/${id}/activity`)).data,

  createDocument: async (
    input: { file: File; name?: string; description?: string; note?: string; client_id?: number },
    onProgress?: Progress,
  ) => {
    const form = new FormData();
    Object.entries(input).forEach(([k, v]) => v !== undefined && v !== '' && form.append(k, v instanceof File ? v : String(v)));
    return (await http.post<PortalDocument>('/api/documents', form, { onUploadProgress: progressHandler(onProgress) })).data;
  },

  updateDocument: async (id: number, data: { name?: string; description?: string | null }) =>
    (await http.patch<PortalDocument>(`/api/documents/${id}`, data)).data,

  archiveDocument: async (id: number) => {
    await http.delete(`/api/documents/${id}`);
  },
  unarchiveDocument: async (id: number) => (await http.post<PortalDocument>(`/api/documents/${id}/unarchive`)).data,

  // Versions
  uploadVersion: async (id: number, file: File, note?: string, onProgress?: Progress) => {
    const form = new FormData();
    form.append('file', file);
    if (note) form.append('note', note);
    return (
      await http.post<PortalDocument>(`/api/documents/${id}/versions`, form, { onUploadProgress: progressHandler(onProgress) })
    ).data;
  },
  restoreVersion: async (id: number, version: number, note?: string) =>
    (await http.post<PortalDocument>(`/api/documents/${id}/versions/${version}/restore`, { note: note || undefined })).data,

  // Admin
  clients: async () => (await http.get<Client[]>('/api/admin/clients')).data,
  client: async (id: number | string) => (await http.get<Client>(`/api/admin/clients/${id}`)).data,
  createClient: async (data: { name: string; contact_email?: string }) =>
    (await http.post<Client>('/api/admin/clients', data)).data,
  createClientUser: async (clientId: number, data: { name: string; email: string; password: string }) =>
    (await http.post<User>(`/api/admin/clients/${clientId}/users`, data)).data,
  deleteClientUser: async (clientId: number, userId: number) => {
    await http.delete(`/api/admin/clients/${clientId}/users/${userId}`);
  },
};
