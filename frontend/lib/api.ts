import axios from "axios";
import type {
  AuthResponse, User, Contact, ContactListResponse, ContactCreate,
  Tag, AnalyticsData, AISearchResponse, DuplicateGroup, SmartDuplicateGroup,
  HistoryEntry, Reminder, Webhook,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

// Attach token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (email: string, password: string, full_name?: string) =>
    api.post<AuthResponse>("/auth/register", { email, password, full_name }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),
  me: () => api.get<User>("/auth/me"),
  updateMe: (data: Partial<User>) => api.patch<User>("/auth/me", data),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),
};

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contactsAPI = {
  list: (params?: Record<string, unknown>) => api.get<ContactListResponse>("/contacts", { params }),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: ContactCreate) => api.post<Contact>("/contacts", data),
  update: (id: string, data: Partial<ContactCreate>) => api.patch<Contact>(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Contact>(`/contacts/${id}/photo`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  deletePhoto: (id: string) => api.delete<Contact>(`/contacts/${id}/photo`),
  toggleFavorite: (id: string) => api.post<Contact>(`/contacts/${id}/favorite`),
  getHistory: (id: string) => api.get<HistoryEntry[]>(`/contacts/${id}/history`),
  createShareLink: (id: string) => api.post<{ share_token: string; share_url: string }>(`/contacts/${id}/share`),
  revokeShareLink: (id: string) => api.delete(`/contacts/${id}/share`),
};

// ── Tags ──────────────────────────────────────────────────────────────────────
export const tagsAPI = {
  list: () => api.get<Tag[]>("/contacts/tags"),
  create: (name: string, color?: string) => api.post<Tag>("/contacts/tags", { name, color }),
  delete: (id: string) => api.delete(`/contacts/tags/${id}`),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  search: (query: string) => api.post<AISearchResponse>("/ai/search", { query }),
  duplicates: () => api.get<DuplicateGroup[]>("/ai/duplicates"),
  smartDuplicates: () => api.get<SmartDuplicateGroup[]>("/ai/smart-duplicates"),
  merge: (primary_id: string, secondary_id: string, field_preferences?: Record<string, string>) =>
    api.post<Contact>("/ai/merge", { primary_id, secondary_id, field_preferences: field_preferences ?? {} }),
  autoTag: (contact_id: string) => api.post<{ suggested_tags: string[] }>("/ai/auto-tag", { contact_id }),
  enrich: (contact_id: string) => api.post<{ suggestions: Record<string, string> }>("/ai/enrich", { contact_id }),
  parseBusinessCard: (text: string) => api.post<{ parsed: Partial<ContactCreate> }>("/ai/parse-business-card", { text }),
  parseBusinessCardPhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ parsed: Partial<ContactCreate> }>("/ai/parse-business-card-photo", form);
  },
  summary: (contact_id: string) => api.get<{ summary: string }>(`/ai/${contact_id}/summary`),
  nba: () => api.get<{ suggestions: Array<{ type: string; priority: string; icon: string; contact_id: string | null; contact_name: string | null; company?: string; message: string; action: string }> }>("/ai/nba"),
};

// ── Import / Export ───────────────────────────────────────────────────────────
export const ioAPI = {
  exportCSV: () => `${BASE}/api/io/export/csv`,
  exportVCard: () => `${BASE}/api/io/export/vcard`,
  exportJSON: () => `${BASE}/api/io/export/json`,
  importCSV: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ added: number; skipped: number; errors: string[] }>("/io/import/csv", form);
  },
  importVCard: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ added: number; skipped: number; errors: string[] }>("/io/import/vcard", form);
  },
  getQR: (contact_id: string) => api.get<{ qr_code: string; contact_name: string }>(`/io/${contact_id}/qr`),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get: () => api.get<AnalyticsData>("/analytics"),
};

// ── Sharing ───────────────────────────────────────────────────────────────────
export const sharingAPI = {
  getShared: (token: string) => api.get<Contact>(`/share/${token}`),
};

// ── Reminders ─────────────────────────────────────────────────────────────────
export const remindersAPI = {
  list: () => api.get<Reminder[]>("/reminders"),
  create: (contact_id: string, data: Omit<Reminder, "id" | "contact_id" | "is_sent">) =>
    api.post<Reminder>(`/reminders/${contact_id}`, data),
  delete: (id: string) => api.delete(`/reminders/${id}`),
};

// ── Google Contacts Sync ──────────────────────────────────────────────────────
export const googleAPI = {
  status: () => api.get<{ connected: boolean }>("/google/status"),
  auth: () => api.get<{ auth_url: string }>("/google/auth"),
  preview: () => api.get<{ count: number; contacts: Array<{ id: string; name: string; email?: string; phone?: string; company?: string; job_title?: string }> }>("/google/preview"),
  sync: () => api.post<{ synced: number; errors: string[]; total: number }>("/google/sync"),
  disconnect: () => api.delete<{ disconnected: boolean }>("/google/disconnect"),
  listContacts: () => api.get<{ contacts: Array<{ resource_name: string; name: string; email?: string; phone?: string; company?: string; job_title?: string }>; count: number }>("/google/list-contacts"),
  importContacts: () => api.post<{ added: number; skipped: number; total: number }>("/google/import-contacts"),
};

// ── Webhooks ──────────────────────────────────────────────────────────────────
export const webhooksAPI = {
  list: () => api.get<Webhook[]>("/webhooks"),
  create: (data: Omit<Webhook, "id" | "is_active" | "created_at">) => api.post<Webhook>("/webhooks", data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  toggle: (id: string) => api.patch<Webhook>(`/webhooks/${id}/toggle`),
};

export default api;
