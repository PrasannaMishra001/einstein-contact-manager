"use client";
import { useState, useCallback, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { contactsAPI, tagsAPI } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { useLocalContacts } from "@/lib/contacts/useLocalContacts";
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { AISearch } from "@/components/contacts/AISearch";
import { SyncStatus } from "@/components/contacts/SyncStatus";
import { Plus, Search, RefreshCw, Brain, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { cn, debounce } from "@/lib/utils";
import type { Contact } from "@/types";

function ContactsPageInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sort, setSort] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  const favorites = searchParams.get("favorites") === "true";
  const archived = searchParams.get("archived") === "true";

  const debouncedSet = useCallback(debounce((v: unknown) => { setDebouncedSearch(v as string); setPage(1); }, 300), []);

  // ── Local-first store (primary) ──────────────────────────────────────────────
  const userId = getUserId();
  const params = { page, per_page: 20, search: debouncedSearch || undefined, tag: selectedTag || undefined, favorites, archived, sort };
  const lc = useLocalContacts(userId, params);
  const usingLocal = !lc.degraded;

  // ── Server-backed fallback — only active if the local layer is unavailable ───
  const serverQuery = useQuery({
    queryKey: ["contacts", params],
    queryFn: () => contactsAPI.list(params).then(r => r.data),
    enabled: lc.degraded,
  });
  const serverTags = useQuery({ queryKey: ["tags"], queryFn: () => tagsAPI.list().then(r => r.data), enabled: lc.degraded });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.delete(id),
    onSuccess: () => { toast.success("Contact deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: () => toast.error("Failed to delete"),
  });
  const favMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  // ── Unified data source ──────────────────────────────────────────────────────
  const contacts = usingLocal ? lc.contacts : (serverQuery.data?.contacts ?? []);
  const total = usingLocal ? lc.total : (serverQuery.data?.total ?? 0);
  const pages = usingLocal ? lc.pages : (serverQuery.data?.pages ?? 1);
  const tags = usingLocal ? lc.tags : (serverTags.data ?? []);
  const isLoading = usingLocal ? !lc.ready : serverQuery.isLoading;

  const refetch = () => { if (usingLocal) lc.actions?.refresh(); else serverQuery.refetch(); };

  const handleEdit = (c: Contact) => { setEditContact(c); setShowForm(true); };
  const handleDelete = (id: string) => {
    if (!confirm("Delete this contact?")) return;
    if (usingLocal) { lc.actions?.remove(id); toast.success("Contact deleted"); }
    else deleteMutation.mutate(id);
  };
  const handleFavorite = (id: string) => {
    if (usingLocal) lc.actions?.toggleFavorite(id);
    else favMutation.mutate(id);
  };
  const handleClose = () => { setShowForm(false); setEditContact(null); };

  // When local, route the form through the store (offline-capable). Photo upload
  // stays on the online API; for a brand-new offline contact it's deferred.
  const onSave = usingLocal
    ? async (payload: Record<string, unknown>, id?: string) =>
        id ? lc.actions!.update(id, payload) : lc.actions!.create(payload)
    : undefined;

  const title = archived ? "Archived" : favorites ? "Favorites" : "All Contacts";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="neo-badge bg-yellow-300 text-black">
              {total} contacts
            </span>
            {usingLocal && <SyncStatus online={lc.online} pending={lc.pending} />}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setShowAI(!showAI)}
            className={cn("neo-btn text-xs px-3 py-2",
              showAI ? "bg-black text-yellow-300" : "bg-cyan-300 text-black")}>
            <Brain className="w-3.5 h-3.5" aria-hidden="true" />
            AI Search
          </button>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={cn("neo-btn text-xs px-3 py-2",
              showFilters ? "bg-black text-white" : "neo-btn-white")}>
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Filters
          </button>
          <button type="button" onClick={() => refetch()}
            className="neo-btn-white p-2" aria-label="Refresh contacts">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button"
            onClick={() => { setEditContact(null); setShowForm(true); }}
            className="neo-btn-primary px-4 py-2 text-xs">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Contact
          </button>
        </div>
      </div>

      {/* AI Search Panel */}
      {showAI && (
        <div className="border-2 border-black bg-cyan-50 shadow-neo p-1">
          <AISearch onClose={() => setShowAI(false)} />
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" aria-hidden="true" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); }}
          placeholder="Search contacts..."
          aria-label="Search contacts"
          className="neo-input pl-9"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-2 border-black bg-yellow-50 p-4 shadow-neo-sm flex flex-wrap gap-3 items-center animate-slide-up">
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase tracking-widest">Tag</label>
              <select value={selectedTag} onChange={e => { setSelectedTag(e.target.value); setPage(1); }}
                aria-label="Filter by tag"
                className="neo-input py-1.5 text-xs w-auto">
                <option value="">All tags</option>
                {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs font-black uppercase tracking-widest">Sort</label>
            <select value={sort} onChange={e => setSort(e.target.value)}
              aria-label="Sort contacts"
              className="neo-input py-1.5 text-xs w-auto">
              <option value="name">Name A–Z</option>
              <option value="-name">Name Z–A</option>
              <option value="created">Newest first</option>
              <option value="updated">Recently updated</option>
              <option value="favorite">Favorites first</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <ContactTable
        contacts={contacts}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleFavorite={handleFavorite}
        page={page}
        pages={pages}
        onPageChange={setPage}
      />

      {/* Form modal */}
      {showForm && (
        <ContactForm
          contact={editContact}
          tags={tags ?? []}
          onSave={onSave}
          onClose={handleClose}
          onSuccess={() => { handleClose(); if (!usingLocal) qc.invalidateQueries({ queryKey: ["contacts"] }); }}
        />
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsPageInner />
    </Suspense>
  );
}
