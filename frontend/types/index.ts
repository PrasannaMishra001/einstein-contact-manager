export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}

export interface SocialLinks {
  linkedin?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  website?: string | null;
  github?: string | null;
  youtube?: string | null;
  [key: string]: string | null | undefined;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  address: Address | null;
  birthday: string | null;
  anniversary: string | null;
  photo_url: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  share_token: string | null;
  tags: Tag[];
  social_links: SocialLinks | null;
  created_at: string;
  updated_at: string;
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ContactCreate {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  job_title?: string;
  address?: Address;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  is_favorite?: boolean;
  tag_ids?: string[];
  social_links?: SocialLinks | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AnalyticsData {
  total_contacts: number;
  favorites: number;
  with_email: number;
  with_phone: number;
  with_photo: number;
  archived: number;
  total_tags: number;
  google_synced: number;
  contacts_this_month: number;
  contacts_this_week: number;
  tag_breakdown: Array<{ name: string; color: string; count: number }>;
  growth_chart: Array<{ month: string; count: number }>;
}

export interface HistoryEntry {
  id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AISearchResponse {
  contacts: Contact[];
  explanation: string;
  suggested_filters: Record<string, unknown>;
}

export interface DuplicateGroup {
  contacts: Contact[];
  similarity_score: number;
  reason: string;
}

export interface SmartDuplicateGroup {
  ids: string[];
  names: string[];
  similarity_score: number;
  reason: string;
  contacts: Contact[];
}

export interface Reminder {
  id: string;
  contact_id: string;
  reminder_type: string;
  message: string | null;
  remind_at: string;
  is_sent: boolean;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}
