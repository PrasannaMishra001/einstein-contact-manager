"use client";
/**
 * React binding for the local-first contacts store. One store instance per user
 * (module singleton), wired to IndexedDB, the real API, online/offline events,
 * and a BroadcastChannel for cross-tab sync. If the local layer fails to init
 * (IndexedDB blocked, etc.), `degraded` is true and the page falls back to the
 * plain server path.
 */
import { useEffect, useReducer, useRef } from "react";
import toast from "react-hot-toast";
import { contactsAPI, tagsAPI } from "@/lib/api";
import { indexedDBPersistence } from "@/lib/localdb";
import { LocalContactsStore, type ContactsApi, type QueryParams } from "./localStore";
import type { ContactCreate } from "@/types";

const apiAdapter: ContactsApi = {
  async list(page, perPage) {
    const { data } = await contactsAPI.list({ page, per_page: perPage });
    return { contacts: data.contacts, pages: data.pages };
  },
  async create(payload) {
    const { data } = await contactsAPI.create(payload as unknown as ContactCreate);
    return data;
  },
  async update(id, payload) {
    const { data } = await contactsAPI.update(id, payload as unknown as Partial<ContactCreate>);
    return data;
  },
  async remove(id) {
    await contactsAPI.delete(id);
  },
  async listTags() {
    const { data } = await tagsAPI.list();
    return data;
  },
};

const stores = new Map<string, LocalContactsStore>();
let channel: BroadcastChannel | null = null;

function getStore(userId: string): LocalContactsStore {
  let store = stores.get(userId);
  if (!store) {
    if (typeof window !== "undefined" && "BroadcastChannel" in window && !channel) {
      channel = new BroadcastChannel("einstein-contacts");
    }
    store = new LocalContactsStore({
      persistence: indexedDBPersistence,
      api: apiAdapter,
      isOnline: () => (typeof navigator !== "undefined" ? navigator.onLine : true),
      broadcast: (msg) => channel?.postMessage(msg),
      onError: (m) => toast.error(m),
    });
    stores.set(userId, store);
    void store.init(userId);
  }
  return store;
}

export function useLocalContacts(userId: string | null, params: QueryParams) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const storeRef = useRef<LocalContactsStore | null>(null);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    let store: LocalContactsStore;
    try {
      store = getStore(userId);
    } catch {
      force();
      return;
    }
    storeRef.current = store;
    const unsub = store.subscribe(force);
    const goOnline = () => store.setOnline(true);
    const goOffline = () => store.setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const onMsg = () => void store.reloadFromDisk();
    channel?.addEventListener("message", onMsg);
    force();
    return () => {
      unsub();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      channel?.removeEventListener("message", onMsg);
    };
  }, [userId]);

  const store = storeRef.current;
  // Only fall back to the server path on a *real* failure — a not-yet-created
  // store just means "still hydrating" (show a loading state, don't server-fetch).
  const degraded = !!store?.failed;
  const result = store && store.ready && !store.failed ? store.query(params) : null;

  return {
    ready: !!store?.ready,
    degraded,
    online: store?.online ?? true,
    pending: store?.pending ?? 0,
    contacts: result?.contacts ?? [],
    total: result?.total ?? 0,
    pages: result?.pages ?? 1,
    tags: store?.tags ?? [],
    actions: store
      ? {
          create: (p: Record<string, unknown>) => store.createContact(p),
          update: (id: string, p: Record<string, unknown>) => store.updateContact(id, p),
          remove: (id: string) => store.deleteContact(id),
          toggleFavorite: (id: string) => store.toggleFavorite(id),
          refresh: () => store.pullAll(),
        }
      : null,
  };
}
