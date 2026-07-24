/**
 * Local-first contacts store (CRDT Phase 1)
 * -----------------------------------------
 * Every device holds all contacts in a CRDT `Replica`, persisted to IndexedDB.
 * The UI reads/searches/sorts/paginates this local replica (instant, offline),
 * and writes apply locally first, then flush to the server.
 *
 * Honest scope: the server is not CRDT-aware, so sync is "local pending edits
 * win; a server pull is authoritative for everything not queued." True
 * multi-writer conflict-free merge across devices is Phase 2 (`/api/sync`).
 *
 * The pure helpers (mapping, apply, query, remap) are exported and unit-tested
 * without a browser; the controller takes injected adapters (persistence, api,
 * broadcast, clock) so it too is testable.
 */

import {
  Replica, materialize, readORSet,
  type ContactField, type MaterializedContact, type ReplicaState, type Scalar,
} from "@/lib/crdt";
import type { Contact, Tag } from "@/types";

// ── op queue + adapters ───────────────────────────────────────────────────────

export type OpType = "create" | "update" | "delete";

export interface QueuedOp {
  opId: string;
  type: OpType;
  contactId: string;                    // local id (a temp UUID until first sync)
  payload?: Record<string, unknown>;    // server-shaped ContactCreate / ContactUpdate
  createdAt: number;
}

export interface Persistence {
  loadState(userId: string): Promise<ReplicaState | null>;
  saveState(userId: string, state: ReplicaState): Promise<void>;
  loadQueue(userId: string): Promise<QueuedOp[]>;
  saveQueue(userId: string, q: QueuedOp[]): Promise<void>;
  loadTags(userId: string): Promise<Tag[] | null>;
  saveTags(userId: string, tags: Tag[]): Promise<void>;
  getDeviceId(): Promise<string>;
}

export interface ContactsApi {
  list(page: number, perPage: number): Promise<{ contacts: Contact[]; pages: number }>;
  create(payload: Record<string, unknown>): Promise<Contact>;
  update(id: string, payload: Record<string, unknown>): Promise<Contact>;
  remove(id: string): Promise<void>;
  listTags(): Promise<Tag[]>;
}

export interface QueryParams {
  page: number;
  per_page: number;
  search?: string;
  tag?: string;                          // tag NAME (matches the page's filter)
  favorites?: boolean;
  archived?: boolean;
  sort?: string;                         // name | -name | created | updated | favorite
}

const EPOCH = "1970-01-01T00:00:00.000Z";

// ── pure: server Contact ⇄ CRDT ───────────────────────────────────────────────

/** Map a server-shaped payload (snake_case) to CRDT field values (camelCase). */
export function fieldsFromPayload(p: Record<string, unknown>): Partial<Record<ContactField, Scalar>> {
  const f: Partial<Record<ContactField, Scalar>> = {};
  const text: Record<string, ContactField> = {
    name: "name", phone: "phone", email: "email", company: "company",
    job_title: "jobTitle", notes: "notes", birthday: "birthday",
    anniversary: "anniversary", photo_url: "photoUrl", share_token: "shareToken",
  };
  for (const [sk, ck] of Object.entries(text)) {
    if (sk in p) f[ck] = (p[sk] as string | null) ?? "";
  }
  if ("is_favorite" in p) f.isFavorite = !!p.is_favorite;
  if ("is_archived" in p) f.isArchived = !!p.is_archived;
  if ("address" in p) f.address = p.address ? JSON.stringify(p.address) : "";
  if ("social_links" in p) f.socialLinks = p.social_links ? JSON.stringify(p.social_links) : "";
  return f;
}

function reconcileTags(replica: Replica, id: string, tagIds: string[]): void {
  const doc = replica.state.docs[id];
  const current = doc ? readORSet(doc.tags) : [];
  for (const t of current) if (!tagIds.includes(t)) replica.removeTag(id, t);
  for (const t of tagIds) if (!current.includes(t)) replica.addTag(id, t);
}

/** Apply one op to the replica (used both for live writes and queue re-apply). */
export function applyToReplica(replica: Replica, op: QueuedOp, nowIso: () => string): void {
  if (op.type === "delete") { replica.remove(op.contactId); return; }
  const p = op.payload ?? {};
  if (op.type === "create") {
    replica.create(op.contactId, {});
    replica.setField(op.contactId, "createdAt", nowIso());
  }
  replica.setMany(op.contactId, fieldsFromPayload(p));
  replica.setField(op.contactId, "updatedAt", nowIso());
  if (Array.isArray(p.tag_ids)) reconcileTags(replica, op.contactId, p.tag_ids as string[]);
}

/** Import a server contact into the replica (server-authoritative for its fields). */
export function importServerContact(replica: Replica, c: Contact): void {
  replica.setMany(c.id, {
    name: c.name, phone: c.phone ?? "", email: c.email ?? "", company: c.company ?? "",
    jobTitle: c.job_title ?? "", notes: c.notes ?? "", birthday: c.birthday ?? "",
    anniversary: c.anniversary ?? "", photoUrl: c.photo_url ?? "", shareToken: c.share_token ?? "",
    address: c.address ? JSON.stringify(c.address) : "",
    socialLinks: c.social_links ? JSON.stringify(c.social_links) : "",
    isFavorite: c.is_favorite, isArchived: c.is_archived,
    createdAt: c.created_at, updatedAt: c.updated_at,
  });
  reconcileTags(replica, c.id, c.tags.map((t) => t.id));
  replica.restore(c.id);
}

/** Materialized CRDT contact → server-shaped Contact for the UI. */
export function toServerContact(m: MaterializedContact, tagsById: Map<string, Tag>): Contact {
  return {
    id: m.id,
    name: m.name,
    phone: m.phone || null,
    email: m.email || null,
    company: m.company || null,
    job_title: m.jobTitle || null,
    address: (m.address as Contact["address"]) ?? null,
    birthday: m.birthday || null,
    anniversary: m.anniversary || null,
    photo_url: m.photoUrl || null,
    notes: m.notes || null,
    is_favorite: m.isFavorite,
    is_archived: m.isArchived,
    share_token: m.shareToken || null,
    tags: m.tags.map((id) => tagsById.get(id) ?? { id, name: id, color: "#a3a3a3" }),
    social_links: (m.socialLinks as Contact["social_links"]) ?? null,
    created_at: m.createdAt || EPOCH,
    updated_at: m.updatedAt || m.createdAt || EPOCH,
  };
}

// ── pure: query (filter / sort / paginate) ────────────────────────────────────

function sortContacts(list: Contact[], sort = "name"): Contact[] {
  const by = [...list];
  const cmpName = (a: Contact, b: Contact) => a.name.localeCompare(b.name);
  switch (sort) {
    case "-name": by.sort((a, b) => cmpName(b, a)); break;
    case "created": by.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
    case "updated": by.sort((a, b) => b.updated_at.localeCompare(a.updated_at)); break;
    case "favorite": by.sort((a, b) => (Number(b.is_favorite) - Number(a.is_favorite)) || cmpName(a, b)); break;
    default: by.sort(cmpName);
  }
  return by;
}

export function queryContacts(all: Contact[], params: QueryParams): { contacts: Contact[]; total: number; pages: number; page: number } {
  let list = params.archived ? all.filter((c) => c.is_archived) : all.filter((c) => !c.is_archived);
  if (params.favorites) list = list.filter((c) => c.is_favorite);
  if (params.tag) list = list.filter((c) => c.tags.some((t) => t.name === params.tag));
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((c) =>
      [c.name, c.email, c.phone, c.company, c.job_title, c.notes]
        .some((x) => (x ?? "").toLowerCase().includes(q)),
    );
  }
  list = sortContacts(list, params.sort);
  const total = list.length;
  const perPage = Math.max(1, params.per_page || 20);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, params.page || 1), pages);
  const start = (page - 1) * perPage;
  return { contacts: list.slice(start, start + perPage), total, pages, page };
}

/** Rewrite a temp contact id to its server id across the whole queue. */
export function remapQueue(queue: QueuedOp[], oldId: string, newId: string): void {
  for (const op of queue) if (op.contactId === oldId) op.contactId = newId;
}

function isNetworkError(e: unknown): boolean {
  // axios: a network failure has no `.response`; a rejected request does.
  return !!e && typeof e === "object" && !("response" in (e as object));
}

// ── controller ────────────────────────────────────────────────────────────────

export interface StoreDeps {
  persistence: Persistence;
  api: ContactsApi;
  now?: () => string;
  isOnline?: () => boolean;
  broadcast?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export class LocalContactsStore {
  replica!: Replica;
  queue: QueuedOp[] = [];
  tags: Tag[] = [];
  userId = "";
  ready = false;
  failed = false;
  online = true;
  flushing = false;

  /** temp-create-id → server-id, filled in during flush so a caller can find it. */
  private idMap = new Map<string, string>();
  private listeners = new Set<() => void>();
  private now: () => string;
  private isOnline: () => boolean;

  constructor(private deps: StoreDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
    this.isOnline = deps.isOnline ?? (() => true);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(alsoBroadcast = false) {
    this.listeners.forEach((fn) => fn());
    if (alsoBroadcast) this.deps.broadcast?.("changed");
  }

  async init(userId: string): Promise<void> {
    try {
      this.userId = userId;
      const deviceId = await this.deps.persistence.getDeviceId();
      this.replica = new Replica(deviceId);
      const state = await this.deps.persistence.loadState(userId);
      if (state) this.replica.load(state);
      this.queue = await this.deps.persistence.loadQueue(userId);
      this.tags = (await this.deps.persistence.loadTags(userId)) ?? [];
      this.online = this.isOnline();
      this.ready = true;
      this.emit();
      if (this.online) void this.pullAll();
    } catch {
      // IndexedDB blocked / private mode / corrupt — signal the UI to fall back.
      this.failed = true;
      this.emit();
    }
  }

  /** Reload local state from persistence (used for cross-tab updates). */
  async reloadFromDisk(): Promise<void> {
    const state = await this.deps.persistence.loadState(this.userId);
    if (state) this.replica.load(state);
    this.queue = await this.deps.persistence.loadQueue(this.userId);
    this.tags = (await this.deps.persistence.loadTags(this.userId)) ?? this.tags;
    this.emit();
  }

  private tagsById(): Map<string, Tag> {
    return new Map(this.tags.map((t) => [t.id, t]));
  }

  getContacts(): Contact[] {
    const byId = this.tagsById();
    return materialize(this.replica.state).map((m) => toServerContact(m, byId));
  }

  query(params: QueryParams) {
    return queryContacts(this.getContacts(), params);
  }

  get pending(): number { return this.queue.length; }

  private async persist(): Promise<void> {
    await this.deps.persistence.saveState(this.userId, this.replica.snapshot());
    await this.deps.persistence.saveQueue(this.userId, this.queue);
  }

  private async enqueue(op: QueuedOp): Promise<void> {
    applyToReplica(this.replica, op, this.now);
    this.queue.push(op);
    await this.persist();
    this.emit(true);
    if (this.online) void this.flush();
  }

  /** Create locally (instant). If online, wait for the flush so the caller gets
   *  the real server id back (needed to attach a photo). */
  async createContact(payload: Record<string, unknown>): Promise<{ id: string; synced: boolean }> {
    const tempId = crypto.randomUUID();
    this.idMap.delete(tempId);
    await this.enqueue({ opId: crypto.randomUUID(), type: "create", contactId: tempId, payload, createdAt: Date.now() });
    if (this.online) {
      await this.flush();
      const serverId = this.idMap.get(tempId);
      if (serverId) return { id: serverId, synced: true };
    }
    return { id: tempId, synced: false };
  }
  async updateContact(id: string, payload: Record<string, unknown>): Promise<{ id: string; synced: boolean }> {
    await this.enqueue({ opId: crypto.randomUUID(), type: "update", contactId: id, payload, createdAt: Date.now() });
    if (this.online) await this.flush();
    return { id, synced: this.online && this.queue.length === 0 };
  }
  async deleteContact(id: string): Promise<void> {
    await this.enqueue({ opId: crypto.randomUUID(), type: "delete", contactId: id, createdAt: Date.now() });
  }
  async toggleFavorite(id: string): Promise<void> {
    const current = this.getContacts().find((c) => c.id === id)?.is_favorite ?? false;
    await this.updateContact(id, { is_favorite: !current });
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.online) return;
    this.flushing = true;
    this.emit();
    try {
      while (this.queue.length) {
        const op = this.queue[0];
        try {
          if (op.type === "create") {
            const tempId = op.contactId;
            const created = await this.deps.api.create(op.payload ?? {});
            this.idMap.set(tempId, created.id);
            if (created.id !== tempId) {
              this.replica.renameDoc(tempId, created.id);
              remapQueue(this.queue, tempId, created.id);
            }
            // adopt server-owned metadata without clobbering local edits
            this.replica.setField(created.id, "createdAt", created.created_at);
            if (created.photo_url) this.replica.setField(created.id, "photoUrl", created.photo_url);
            if (created.share_token) this.replica.setField(created.id, "shareToken", created.share_token);
          } else if (op.type === "update") {
            await this.deps.api.update(op.contactId, op.payload ?? {});
          } else {
            await this.deps.api.remove(op.contactId);
          }
          this.queue.shift();
          await this.persist();
          this.emit(true);
        } catch (e) {
          if (isNetworkError(e)) break;              // keep queued, retry on reconnect
          this.queue.shift();                        // server rejected (4xx) → drop
          await this.persist();
          this.deps.onError?.("A queued change was rejected by the server and dropped.");
          this.emit(true);
        }
      }
    } finally {
      this.flushing = false;
      this.emit();
      if (this.online && this.queue.length === 0) void this.pullAll();
    }
  }

  async pullAll(): Promise<void> {
    if (!this.online) return;
    try {
      const server: Contact[] = [];
      let page = 1;
      for (;;) {
        const { contacts, pages } = await this.deps.api.list(page, 100);
        server.push(...contacts);
        if (page >= pages) break;
        page += 1;
      }
      const tags = await this.deps.api.listTags();
      this.tags = tags;
      await this.deps.persistence.saveTags(this.userId, tags);

      const serverIds = new Set(server.map((c) => c.id));
      for (const c of server) importServerContact(this.replica, c);

      // reflect server-side deletions (but keep un-synced local creates)
      const pendingCreateIds = new Set(this.queue.filter((o) => o.type === "create").map((o) => o.contactId));
      for (const id of Object.keys(this.replica.state.docs)) {
        if (!serverIds.has(id) && !pendingCreateIds.has(id) && !this.replica.state.docs[id].deleted.value) {
          this.replica.remove(id);
        }
      }
      // re-apply pending local ops on top so un-synced edits win
      for (const op of this.queue) applyToReplica(this.replica, op, this.now);

      await this.persist();
      this.emit();
    } catch {
      /* offline / transient — keep whatever we have locally */
    }
  }

  setOnline(online: boolean): void {
    const was = this.online;
    this.online = online;
    this.emit();
    if (online && !was) void this.flush();   // flush() pulls afterwards
  }
}
