/**
 * Tests for the local-first contacts store: pure query/apply logic, and the
 * controller's offline → online write-queue with temp-id remap and
 * "local pending edits win" on pull. Uses in-memory adapters — no browser.
 */
import { describe, expect, it, beforeEach } from "vitest";
import type { Contact, Tag } from "@/types";
import type { ReplicaState } from "@/lib/crdt";
import {
  LocalContactsStore, queryContacts, remapQueue,
  type ContactsApi, type Persistence, type QueuedOp,
} from "./localStore";

// ── fixtures ──────────────────────────────────────────────────────────────────

let clock = 0;
function nowIso() { clock += 1; return new Date(1_700_000_000_000 + clock * 1000).toISOString(); }

function serverContact(id: string, p: Record<string, unknown> = {}): Contact {
  const now = nowIso();
  return {
    id, name: (p.name as string) ?? "Unnamed", phone: (p.phone as string) ?? null,
    email: (p.email as string) ?? null, company: (p.company as string) ?? null,
    job_title: (p.job_title as string) ?? null, address: null,
    birthday: (p.birthday as string) ?? null, anniversary: null, photo_url: null,
    notes: (p.notes as string) ?? null, is_favorite: !!p.is_favorite,
    is_archived: !!p.is_archived, share_token: null, tags: (p.tags as Tag[]) ?? [],
    social_links: null, created_at: (p.created_at as string) ?? now, updated_at: now,
  };
}
function applyServerUpdate(c: Contact, p: Record<string, unknown>) {
  for (const k of ["name", "phone", "email", "company", "job_title", "notes", "birthday"] as const) {
    if (k in p) (c as Record<string, unknown>)[k] = p[k];
  }
  if ("is_favorite" in p) c.is_favorite = !!p.is_favorite;
  if ("is_archived" in p) c.is_archived = !!p.is_archived;
  c.updated_at = nowIso();
}

class MemPersistence implements Persistence {
  states = new Map<string, ReplicaState>();
  queues = new Map<string, QueuedOp[]>();
  tags = new Map<string, Tag[]>();
  clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }
  async loadState(u: string) { return this.states.get(u) ?? null; }
  async saveState(u: string, s: ReplicaState) { this.states.set(u, this.clone(s)); }
  async loadQueue(u: string) { return this.clone(this.queues.get(u) ?? []); }
  async saveQueue(u: string, q: QueuedOp[]) { this.queues.set(u, this.clone(q)); }
  async loadTags(u: string) { return this.tags.get(u) ?? null; }
  async saveTags(u: string, t: Tag[]) { this.tags.set(u, t); }
  async getDeviceId() { return "device-A"; }
}

class FakeApi implements ContactsApi {
  db: Contact[] = [];
  tags: Tag[] = [];
  seq = 0;
  up = true;
  private fail() { return Object.assign(new Error("network down")); } // no `.response` → network error
  async list(page: number, perPage: number) {
    if (!this.up) throw this.fail();
    const start = (page - 1) * perPage;
    return { contacts: this.db.slice(start, start + perPage), pages: Math.max(1, Math.ceil(this.db.length / perPage)) };
  }
  async create(payload: Record<string, unknown>) {
    if (!this.up) throw this.fail();
    const c = serverContact(`srv-${++this.seq}`, payload);
    this.db.push(c);
    return c;
  }
  async update(id: string, payload: Record<string, unknown>) {
    if (!this.up) throw this.fail();
    const c = this.db.find((x) => x.id === id);
    if (!c) throw Object.assign(new Error("not found"), { response: { status: 404 } });
    applyServerUpdate(c, payload);
    return c;
  }
  async remove(id: string) {
    if (!this.up) throw this.fail();
    this.db = this.db.filter((x) => x.id !== id);
  }
  async listTags() { if (!this.up) throw this.fail(); return this.tags; }
}

function makeStore(persistence: MemPersistence, api: FakeApi) {
  return new LocalContactsStore({ persistence, api, now: nowIso, isOnline: () => api.up });
}

// ── pure query ────────────────────────────────────────────────────────────────

describe("queryContacts", () => {
  const all: Contact[] = [
    serverContact("1", { name: "Ada", email: "ada@x.com", is_favorite: true }),
    serverContact("2", { name: "Bob", company: "Acme", tags: [{ id: "t1", name: "work", color: "#000" }] }),
    serverContact("3", { name: "Cy", is_archived: true }),
  ];

  it("excludes archived by default, and shows only archived when asked", () => {
    expect(queryContacts(all, { page: 1, per_page: 20 }).total).toBe(2);
    expect(queryContacts(all, { page: 1, per_page: 20, archived: true }).contacts.map(c => c.name)).toEqual(["Cy"]);
  });
  it("filters by favorites, tag name, and search", () => {
    expect(queryContacts(all, { page: 1, per_page: 20, favorites: true }).contacts.map(c => c.name)).toEqual(["Ada"]);
    expect(queryContacts(all, { page: 1, per_page: 20, tag: "work" }).contacts.map(c => c.name)).toEqual(["Bob"]);
    expect(queryContacts(all, { page: 1, per_page: 20, search: "acme" }).contacts.map(c => c.name)).toEqual(["Bob"]);
  });
  it("sorts and paginates", () => {
    expect(queryContacts(all, { page: 1, per_page: 20, sort: "-name" }).contacts.map(c => c.name)).toEqual(["Cy", "Bob", "Ada"].filter(n => n !== "Cy"));
    const p = queryContacts(all, { page: 2, per_page: 1 });
    expect(p.pages).toBe(2);
    expect(p.page).toBe(2);
    expect(p.contacts).toHaveLength(1);
  });
  it("clamps an out-of-range page", () => {
    expect(queryContacts(all, { page: 99, per_page: 1 }).page).toBe(2);
  });
});

describe("remapQueue", () => {
  it("rewrites a temp id to a server id across ops", () => {
    const q: QueuedOp[] = [
      { opId: "a", type: "create", contactId: "temp", createdAt: 1 },
      { opId: "b", type: "update", contactId: "temp", payload: {}, createdAt: 2 },
      { opId: "c", type: "update", contactId: "other", payload: {}, createdAt: 3 },
    ];
    remapQueue(q, "temp", "srv-9");
    expect(q.map(o => o.contactId)).toEqual(["srv-9", "srv-9", "other"]);
  });
});

// ── controller: offline → online ────────────────────────────────────────────

describe("LocalContactsStore offline/online", () => {
  let persistence: MemPersistence;
  let api: FakeApi;
  let store: LocalContactsStore;

  beforeEach(async () => {
    persistence = new MemPersistence();
    api = new FakeApi();
    api.up = false;               // start offline so init doesn't auto-pull
    store = makeStore(persistence, api);
    await store.init("user1");
  });

  it("creates offline (instant, queued) then flushes on reconnect with id remap", async () => {
    const res = await store.createContact({ name: "Grace", email: "grace@x.com" });
    expect(res.synced).toBe(false);
    expect(store.pending).toBe(1);
    expect(store.getContacts().map(c => c.name)).toContain("Grace");
    expect(api.db).toHaveLength(0);

    api.up = true;
    store.online = true;
    await store.flush();

    expect(store.pending).toBe(0);
    expect(api.db).toHaveLength(1);
    expect(api.db[0].name).toBe("Grace");
    // the local doc now carries the server id
    expect(store.getContacts().some(c => c.id === api.db[0].id)).toBe(true);
    // persisted
    expect(persistence.queues.get("user1")).toHaveLength(0);
  });

  it("queues edits/deletes offline and replays them in order", async () => {
    api.up = true; store.online = true;
    const { id } = await store.createContact({ name: "Kay" });
    await store.flush();
    expect(api.db[0].name).toBe("Kay");

    api.up = false; store.online = false;
    await store.updateContact(id, { name: "Kay B" });
    await store.toggleFavorite(id);
    expect(store.pending).toBe(2);
    expect(store.getContacts()[0].name).toBe("Kay B");
    expect(store.getContacts()[0].is_favorite).toBe(true);

    api.up = true; store.online = true;
    await store.flush();
    expect(store.pending).toBe(0);
    expect(api.db[0].name).toBe("Kay B");
    expect(api.db[0].is_favorite).toBe(true);
  });

  it("drops a server-rejected (4xx) op instead of blocking the queue", async () => {
    api.up = true; store.online = true;
    // update a non-existent id → 404 → should be dropped, not retried forever
    await store.updateContact("does-not-exist", { name: "ghost" });
    await store.flush();
    expect(store.pending).toBe(0);
  });

  it("pull re-applies pending local edits so they win over the server", async () => {
    api.up = true; store.online = true;
    api.db.push(serverContact("srv-1", { name: "Bob" }));
    await store.pullAll();
    expect(store.getContacts().find(c => c.id === "srv-1")?.name).toBe("Bob");

    // edit locally while offline
    api.up = false; store.online = false;
    await store.updateContact("srv-1", { name: "Bobby" });

    // server changes underneath us, then we reconnect and pull
    api.db[0].name = "Robert";
    api.up = true; store.online = true;
    await store.pullAll();

    // local un-synced edit wins
    expect(store.getContacts().find(c => c.id === "srv-1")?.name).toBe("Bobby");
  });

  it("reflects server-side deletions on pull (for already-synced contacts)", async () => {
    api.up = true; store.online = true;
    api.db.push(serverContact("srv-1", { name: "Temp" }));
    await store.pullAll();
    expect(store.getContacts().some(c => c.id === "srv-1")).toBe(true);

    api.db = [];                 // deleted elsewhere
    await store.pullAll();
    expect(store.getContacts().some(c => c.id === "srv-1")).toBe(false);
  });
});
