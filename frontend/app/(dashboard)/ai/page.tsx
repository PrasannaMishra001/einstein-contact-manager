"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiAPI, tagsAPI, contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Brain, Copy, Merge, AlertTriangle, Loader2, Sparkles, CheckCircle, Tag } from "lucide-react";
import type { DuplicateGroup, Contact } from "@/types";
import { getInitials, generateAvatarColor, cn } from "@/lib/utils";

export default function AIToolsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"duplicates" | "enrich" | "autotag">("duplicates");
  const [loadingDupes, setLoadingDupes] = useState(false);
  const [dupes, setDupes] = useState<DuplicateGroup[]>([]);
  const [enrichSearch, setEnrichSearch] = useState("");
  const [enrichContact, setEnrichContact] = useState<Contact | null>(null);
  const [enrichResult, setEnrichResult] = useState<Record<string, string> | null>(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);
  const [autoTagContact, setAutoTagContact] = useState<Contact | null>(null);
  const [autoTagSearch, setAutoTagSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const { data: searchContacts } = useQuery({
    queryKey: ["contacts-search", enrichSearch],
    queryFn: () => contactsAPI.list({ search: enrichSearch, per_page: 5 }).then(r => r.data.contacts),
    enabled: enrichSearch.length > 1,
  });

  const { data: tagSearchContacts } = useQuery({
    queryKey: ["contacts-search-tags", autoTagSearch],
    queryFn: () => contactsAPI.list({ search: autoTagSearch, per_page: 5 }).then(r => r.data.contacts),
    enabled: autoTagSearch.length > 1,
  });

  const findDupes = async () => {
    setLoadingDupes(true);
    try {
      const { data } = await aiAPI.duplicates();
      setDupes(data);
      if (!data.length) toast.success("No duplicates found!");
    } catch { toast.error("Failed to analyze duplicates"); }
    finally { setLoadingDupes(false); }
  };

  const enrichContact_ = async (id: string) => {
    setLoadingEnrich(true);
    try {
      const { data } = await aiAPI.enrich(id);
      setEnrichResult(data.suggestions as Record<string, string>);
    } catch { toast.error("Enrichment failed"); }
    finally { setLoadingEnrich(false); }
  };

  const autoTag = async (id: string) => {
    setLoadingTags(true);
    try {
      const { data } = await aiAPI.autoTag(id);
      setSuggestions(data.suggested_tags);
    } catch { toast.error("Auto-tag failed"); }
    finally { setLoadingTags(false); }
  };

  const inputCls = "w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-brand-500" />AI Tools</h1><p className="text-muted-foreground text-sm mt-0.5">Powered by Gemini 2.0 Flash</p></div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {[{ id: "duplicates", label: "Duplicate Finder" }, { id: "enrich", label: "Enrich Contact" }, { id: "autotag", label: "Auto Tag" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Duplicates */}
      {tab === "duplicates" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-2">Find Duplicate Contacts</h3>
            <p className="text-sm text-muted-foreground mb-4">AI analyzes your contacts to detect likely duplicates.</p>
            <button onClick={findDupes} disabled={loadingDupes}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {loadingDupes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingDupes ? "Analyzing…" : "Find Duplicates"}
            </button>
          </div>
          {dupes.map((group, i) => (
            <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{group.reason}</span>
                <span className="ml-auto text-xs text-muted-foreground">{Math.round(group.similarity_score * 100)}% match</span>
              </div>
              {group.contacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0", generateAvatarColor(c.name))}>
                    {getInitials(c.name)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Enrich */}
      {tab === "enrich" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">Enrich Contact Details</h3>
          <p className="text-sm text-muted-foreground">AI suggests missing fields based on available data.</p>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Search contact</label>
            <input value={enrichSearch} onChange={e => setEnrichSearch(e.target.value)} placeholder="Type a name…" className={inputCls} />
            {searchContacts && searchContacts.length > 0 && !enrichContact && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                {searchContacts.map(c => (
                  <button key={c.id} onClick={() => { setEnrichContact(c); setEnrichSearch(c.name); setEnrichResult(null); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{c.name}</button>
                ))}
              </div>
            )}
          </div>
          {enrichContact && (
            <button onClick={() => enrichContact_(enrichContact.id)} disabled={loadingEnrich}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {loadingEnrich ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingEnrich ? "Analyzing…" : `Enrich "${enrichContact.name}"`}
            </button>
          )}
          {enrichResult && Object.keys(enrichResult).length > 0 && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" />AI Suggestions</p>
              {Object.entries(enrichResult).map(([k, v]) => v && (
                <div key={k} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="capitalize text-muted-foreground">{k.replace("_", " ")}</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {enrichResult && Object.keys(enrichResult).length === 0 && (
            <p className="text-sm text-muted-foreground">No additional information could be suggested for this contact.</p>
          )}
        </div>
      )}

      {/* Auto Tag */}
      {tab === "autotag" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">Auto Tag Suggestion</h3>
          <p className="text-sm text-muted-foreground">AI suggests relevant tags based on contact info.</p>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Search contact</label>
            <input value={autoTagSearch} onChange={e => setAutoTagSearch(e.target.value)} placeholder="Type a name…" className={inputCls} />
            {tagSearchContacts && tagSearchContacts.length > 0 && !autoTagContact && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                {tagSearchContacts.map(c => (
                  <button key={c.id} onClick={() => { setAutoTagContact(c); setAutoTagSearch(c.name); setSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{c.name}</button>
                ))}
              </div>
            )}
          </div>
          {autoTagContact && (
            <button onClick={() => autoTag(autoTagContact.id)} disabled={loadingTags}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {loadingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              {loadingTags ? "Analyzing…" : "Suggest Tags"}
            </button>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested tags:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-sm border border-brand-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
