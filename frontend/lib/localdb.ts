/**
 * IndexedDB persistence for the local-first contacts store.
 * Browser-only. Everything is keyed per user so switching accounts never mixes
 * data. Implements the `Persistence` port from lib/contacts/localStore.ts.
 */
import { openDB, type IDBPDatabase } from "idb";
import type { Persistence, QueuedOp } from "@/lib/contacts/localStore";
import type { ReplicaState } from "@/lib/crdt";
import type { Tag } from "@/types";

const DB_NAME = "einstein-local";
const DB_VERSION = 1;
const STORES = ["state", "queue", "tags", "meta"] as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
      },
    });
  }
  return dbPromise;
}

export const indexedDBPersistence: Persistence = {
  async loadState(userId) {
    return ((await (await db()).get("state", userId)) as ReplicaState | undefined) ?? null;
  },
  async saveState(userId, state) {
    await (await db()).put("state", state, userId);
  },
  async loadQueue(userId) {
    return ((await (await db()).get("queue", userId)) as QueuedOp[] | undefined) ?? [];
  },
  async saveQueue(userId, q) {
    await (await db()).put("queue", q, userId);
  },
  async loadTags(userId) {
    return ((await (await db()).get("tags", userId)) as Tag[] | undefined) ?? null;
  },
  async saveTags(userId, tags) {
    await (await db()).put("tags", tags, userId);
  },
  async getDeviceId() {
    const d = await db();
    let id = (await d.get("meta", "deviceId")) as string | undefined;
    if (!id) {
      id = crypto.randomUUID();
      await d.put("meta", id, "deviceId");
    }
    return id;
  },
};
