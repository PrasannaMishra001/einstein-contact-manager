"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { contactsAPI, tagsAPI } from "@/lib/api";
import { ContactTable } from "@/components/contacts/ContactTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { AISearch } from "@/components/contacts/AISearch";
import { Plus, Search, SlidersHorizontal, RefreshCw, Brain } from "lucide-react";
import toast from "react-hot-toast";
import { cn, debounce } from "@/lib/utils";
import type { Contact } from "@/types";

export default function ContactsPage() {
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

  const favorites = searchParams.get("favorites") === "true";
  const archived = searchParams.get("archived") === "true";

  const debouncedSet = useCallback(debounce((v: unknown) => { setDebouncedSearch(v as string); setPage(1); }, 300), []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contacts", { page, search: debouncedSearch, tag: selectedTag, favorites, archived, sort }],
    queryFn: () => contactsAPI.list({ page, per_page: 20, search: debouncedSearch || undefined, tag: selectedTag || undefined, favorites: favorites || undefined, archived, sort }).then(r => r.data),
  });

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => tagsAPI.list().then(r => r.data) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.delete(id),
    onSuccess: () => { toast.success("Contact deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: () => toast.error("Failed to delete"),
  });

  const favMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const handleEdit = (c: Contact) => { setEditContact(c); setShowForm(true); };
  const handleDelete = (id: string) => { if (confirm("Delete this contact?")) deleteMutation.mutate(id); };
  const handleClose = () => { setShowForm(false); setEditContact(null); };

  const title = archived ? "Archived Contacts" : favorites ? "Favorite Contacts" : "All Contacts";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? 0} contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAI(!showAI)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
              showAI ? "bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400" : "border-border hover:bg-accent")}>
            <Brain className="w-4 h-4" /> AI Search
          </button>
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditContact(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* AI Search Panel */}
      {showAI && <AISearch onClose={() => setShowAI(false)} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); }}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {tags && tags.length > 0 && (
          <select value={selectedTag} onChange={e => { setSelectedTag(e.target.value); setPage(1); }}
            className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All tags</option>
            {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        )}

        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="name">Name A–Z</option>
          <option value="-name">Name Z–A</option>
          <option value="created">Newest first</option>
          <option value="updated">Recently updated</option>
          <option value="favorite">Favorites first</option>
        </select>
      </div>

      {/* Table */}
      <ContactTable
        contacts={data?.contacts ?? []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleFavorite={(id) => favMutation.mutate(id)}
        page={page}
        pages={data?.pages ?? 1}
        onPageChange={setPage}
      />

      {/* Form modal */}
      {showForm && (
        <ContactForm
          contact={editContact}
          tags={tags ?? []}
          onClose={handleClose}
          onSuccess={() => { handleClose(); qc.invalidateQueries({ queryKey: ["contacts"] }); }}
        />
      )}
    </div>
  );
}
