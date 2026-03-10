"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiAPI, contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Brain, Loader2, Sparkles, CheckCircle, Tag, AlertTriangle, Merge, X, Bell, Link } from "lucide-react";
import type { DuplicateGroup, SmartDuplicateGroup, Contact } from "@/types";
import { getInitials, generateAvatarColor, cn } from "@/lib/utils";

type Tab = "smart-dupes" | "ai-dupes" | "enrich" | "autotag" | "nudges";

type NBAItem = { type: string; priority: string; icon: string; contact_id: string | null; contact_name: string | null; company?: string; message: string; action: string };

export default function AIToolsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("smart-dupes");
  const [nudges, setNudges] = useState<NBAItem[]>([]);
  const [loadingNudges, setLoadingNudges] = useState(false);

  // Smart duplicates
  const [smartDupes, setSmartDupes] = useState<SmartDuplicateGroup[]>([]);
  const [loadingSmartDupes, setLoadingSmartDupes] = useState(false);
  const [mergingPair, setMergingPair] = useState<{ primary: Contact; secondary: Contact } | null>(null);

  // AI duplicates
  const [dupes, setDupes] = useState<DuplicateGroup[]>([]);
  const [loadingDupes, setLoadingDupes] = useState(false);

  // Enrich
  const [enrichSearch, setEnrichSearch] = useState("");
  const [enrichContact, setEnrichContact] = useState<Contact | null>(null);
  const [enrichResult, setEnrichResult] = useState<Record<string, string> | null>(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  // Auto tag
  const [autoTagSearch, setAutoTagSearch] = useState("");
  const [autoTagContact, setAutoTagContact] = useState<Contact | null>(null);
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

  const findSmartDupes = async () => {
    setLoadingSmartDupes(true);
    try {
      const { data } = await aiAPI.smartDuplicates();
      setSmartDupes(data);
      if (!data.length) toast.success("No duplicates found!");
    } catch { toast.error("Failed to scan duplicates"); }
    finally { setLoadingSmartDupes(false); }
  };

  const findDupes = async () => {
    setLoadingDupes(true);
    try {
      const { data } = await aiAPI.duplicates();
      setDupes(data);
      if (!data.length) toast.success("No duplicates found!");
    } catch { toast.error("Failed to analyze duplicates"); }
    finally { setLoadingDupes(false); }
  };

  const mergeMutation = useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
      aiAPI.merge(primaryId, secondaryId),
    onSuccess: () => {
      toast.success("Contacts merged!");
      setMergingPair(null);
      setSmartDupes([]);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Merge failed"),
  });

  const enrichContactFn = async (id: string) => {
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

  const loadNudges = async () => {
    setLoadingNudges(true);
    try {
      const { data } = await aiAPI.nba();
      setNudges(data.suggestions);
      if (!data.suggestions.length) toast.success("No nudges right now — all caught up!");
    } catch { toast.error("Failed to load nudges"); }
    finally { setLoadingNudges(false); }
  };

  const TABS = [
    { id: "smart-dupes" as Tab, label: "Smart Dupes", color: "bg-yellow-300" },
    { id: "ai-dupes" as Tab, label: "AI Dupes", color: "bg-cyan-300" },
    { id: "enrich" as Tab, label: "Enrich", color: "bg-pink-300" },
    { id: "autotag" as Tab, label: "Auto Tag", color: "bg-green-300" },
    { id: "nudges" as Tab, label: "Nudges", color: "bg-orange-300" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Brain className="w-5 h-5 text-yellow-300" aria-hidden="true" />
          </div>
          AI Tools
        </h1>
        <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">
          Powered by Groq llama-3.3-70b
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-2 border-black overflow-hidden shadow-neo-sm">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-all",
              tab === t.id
                ? `${t.color} border-r-2 border-black last:border-r-0`
                : "bg-white border-r-2 border-black last:border-r-0 hover:bg-yellow-50"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Smart Duplicates */}
      {tab === "smart-dupes" && (
        <div className="space-y-4">
          <div className="neo-card">
            <div className="bg-yellow-300 border-b-2 border-black px-5 py-3">
              <h3 className="font-black uppercase tracking-wide text-sm">Smart Duplicate Finder</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium">Fast deterministic scan — no AI quota used. Detects matching names, phones, and emails using string similarity.</p>
              <button type="button" onClick={findSmartDupes} disabled={loadingSmartDupes}
                className="neo-btn-primary px-5 py-2.5 text-sm">
                {loadingSmartDupes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
                {loadingSmartDupes ? "Scanning..." : "Scan for Duplicates"}
              </button>
            </div>
          </div>

          {/* Duplicate notification cards */}
          {smartDupes.map((group, i) => (
            <div key={i} className="border-4 border-black bg-yellow-50 shadow-neo">
              {/* Banner header */}
              <div className="flex items-center gap-3 bg-yellow-300 border-b-2 border-black px-4 py-3">
                <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="font-black uppercase tracking-wide text-sm flex-1">Possible Duplicate Detected</span>
                <span className="neo-badge bg-black text-yellow-300">
                  {Math.round(group.similarity_score * 100)}% match
                </span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-black/60">{group.reason}</p>
                <div className="grid grid-cols-2 gap-3">
                  {group.contacts.map(c => (
                    <div key={c.id} className="border-2 border-black bg-white p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name} className="w-8 h-8 border-2 border-black object-cover" />
                        ) : (
                          <div className={cn("w-8 h-8 border-2 border-black flex items-center justify-center text-white text-xs font-black", generateAvatarColor(c.name))}>
                            {getInitials(c.name)}
                          </div>
                        )}
                        <span className="font-black text-sm truncate">{c.name}</span>
                      </div>
                      {c.phone && <p className="text-xs text-black/60 font-medium truncate">{c.phone}</p>}
                      {c.email && <p className="text-xs text-black/60 font-medium truncate">{c.email}</p>}
                      {c.company && <p className="text-xs text-black/60 font-medium truncate">{c.company}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  {group.contacts.length >= 2 && (
                    <button type="button"
                      onClick={() => setMergingPair({ primary: group.contacts[0], secondary: group.contacts[1] })}
                      className="neo-btn bg-black text-white px-4 py-2 text-xs">
                      <Merge className="w-3.5 h-3.5" aria-hidden="true" />
                      Merge
                    </button>
                  )}
                  <button type="button"
                    onClick={() => setSmartDupes(prev => prev.filter((_, idx) => idx !== i))}
                    className="neo-btn-white px-4 py-2 text-xs">
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Duplicates */}
      {tab === "ai-dupes" && (
        <div className="space-y-4">
          <div className="neo-card">
            <div className="bg-cyan-300 border-b-2 border-black px-5 py-3">
              <h3 className="font-black uppercase tracking-wide text-sm">AI Duplicate Finder</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium">Uses Groq AI to analyze your contacts for likely duplicates. Uses AI quota (14,400 req/day free).</p>
              <button type="button" onClick={findDupes} disabled={loadingDupes}
                className="neo-btn bg-cyan-300 text-black px-5 py-2.5 text-sm">
                {loadingDupes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" aria-hidden="true" />}
                {loadingDupes ? "Analyzing..." : "Find with AI"}
              </button>
            </div>
          </div>
          {dupes.map((group, i) => (
            <div key={i} className="border-2 border-black bg-orange-50 shadow-neo-sm">
              <div className="flex items-center gap-2 bg-orange-200 border-b-2 border-black px-4 py-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-wide flex-1">{group.reason}</span>
                <span className="neo-badge bg-black text-white">{Math.round(group.similarity_score * 100)}%</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {group.contacts.map(c => (
                  <div key={c.id} className="border-2 border-black bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 border-2 border-black flex items-center justify-center text-white text-xs font-black shrink-0", generateAvatarColor(c.name))}>
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{c.name}</p>
                        <p className="text-xs text-black/50 truncate">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrich */}
      {tab === "enrich" && (
        <div className="neo-card">
          <div className="bg-pink-300 border-b-2 border-black px-5 py-3">
            <h3 className="font-black uppercase tracking-wide text-sm">Enrich Contact Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium">AI suggests missing fields based on available data.</p>
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Search contact</label>
              <input value={enrichSearch} onChange={e => { setEnrichSearch(e.target.value); setEnrichContact(null); setEnrichResult(null); }}
                placeholder="Type a name..." aria-label="Search contact to enrich" className="neo-input" />
              {searchContacts && searchContacts.length > 0 && !enrichContact && (
                <div className="border-2 border-black border-t-0 bg-white">
                  {searchContacts.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setEnrichContact(c); setEnrichSearch(c.name); setEnrichResult(null); }}
                      className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-yellow-50 border-b border-black/10 last:border-0">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {enrichContact && (
              <button type="button" onClick={() => enrichContactFn(enrichContact.id)} disabled={loadingEnrich}
                className="neo-btn bg-pink-300 text-black px-5 py-2.5 text-sm">
                {loadingEnrich ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
                {loadingEnrich ? "Analyzing..." : `Enrich "${enrichContact.name}"`}
              </button>
            )}
            {enrichResult && Object.keys(enrichResult).length > 0 && (
              <div className="border-2 border-black bg-green-50">
                <div className="bg-green-300 border-b-2 border-black px-4 py-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wide">AI Suggestions</span>
                </div>
                <div className="p-4 space-y-2">
                  {Object.entries(enrichResult).map(([k, v]) => v && (
                    <div key={k} className="flex justify-between text-sm py-1.5 border-b border-black/10 last:border-0">
                      <span className="capitalize font-black text-xs uppercase tracking-wide text-black/60">{k.replace("_", " ")}</span>
                      <span className="font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {enrichResult && Object.keys(enrichResult).length === 0 && (
              <p className="text-sm font-medium text-black/50">No additional information could be suggested.</p>
            )}
          </div>
        </div>
      )}

      {/* Auto Tag */}
      {tab === "autotag" && (
        <div className="neo-card">
          <div className="bg-green-300 border-b-2 border-black px-5 py-3">
            <h3 className="font-black uppercase tracking-wide text-sm">Auto Tag Suggestion</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium">AI suggests relevant tags based on contact info.</p>
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Search contact</label>
              <input value={autoTagSearch} onChange={e => { setAutoTagSearch(e.target.value); setAutoTagContact(null); setSuggestions([]); }}
                placeholder="Type a name..." aria-label="Search contact for auto-tagging" className="neo-input" />
              {tagSearchContacts && tagSearchContacts.length > 0 && !autoTagContact && (
                <div className="border-2 border-black border-t-0 bg-white">
                  {tagSearchContacts.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setAutoTagContact(c); setAutoTagSearch(c.name); setSuggestions([]); }}
                      className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-yellow-50 border-b border-black/10 last:border-0">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {autoTagContact && (
              <button type="button" onClick={() => autoTag(autoTagContact.id)} disabled={loadingTags}
                className="neo-btn bg-green-300 text-black px-5 py-2.5 text-sm">
                {loadingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" aria-hidden="true" />}
                {loadingTags ? "Analyzing..." : "Suggest Tags"}
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest">Suggested tags:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <span key={s} className="neo-badge bg-green-200 text-black">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nudges (Next Best Action) */}
      {tab === "nudges" && (
        <div className="space-y-4">
          <div className="neo-card">
            <div className="bg-orange-300 border-b-2 border-black px-5 py-3 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-wide text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" aria-hidden="true" />
                Smart Nudges
              </h3>
              <button type="button" onClick={loadNudges} disabled={loadingNudges}
                className="neo-btn bg-black text-yellow-300 px-4 py-2 text-xs">
                {loadingNudges ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />}
                Analyse
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-black/60 dark:text-white/50">
                Proactive suggestions based on upcoming birthdays, dormant contacts, and company clusters.
              </p>
            </div>
          </div>

          {nudges.map((n, i) => (
            <div key={i} className={`border-2 border-black shadow-neo-sm ${
              n.priority === "high" ? "bg-red-50 dark:bg-red-950/20" :
              n.priority === "medium" ? "bg-yellow-50 dark:bg-yellow-950/20" :
              "bg-white dark:bg-neutral-900"
            }`}>
              <div className={`flex items-center gap-3 px-4 py-3 border-b-2 border-black ${
                n.priority === "high" ? "bg-red-300" :
                n.priority === "medium" ? "bg-yellow-300" :
                "bg-orange-200"
              }`}>
                <span className="text-lg" aria-hidden="true">{n.icon}</span>
                <span className="font-black uppercase tracking-wide text-xs flex-1">{n.type.replace("_", " ")}</span>
                <span className={`neo-badge text-black text-xs ${
                  n.priority === "high" ? "bg-red-400" : n.priority === "medium" ? "bg-yellow-400" : "bg-orange-300"
                }`}>{n.priority}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-bold">{n.message}</p>
                {n.contact_id && (
                  <a href={`/contacts/${n.contact_id}`}
                    className="neo-btn bg-black text-yellow-300 px-3 py-1.5 text-xs shrink-0">
                    <Link className="w-3 h-3" aria-hidden="true" />
                    View
                  </a>
                )}
                <button type="button"
                  onClick={() => setNudges(prev => prev.filter((_, idx) => idx !== i))}
                  className="neo-btn-white px-3 py-1.5 text-xs shrink-0">
                  <X className="w-3 h-3" aria-hidden="true" />
                  Dismiss
                </button>
              </div>
            </div>
          ))}
          {nudges.length === 0 && !loadingNudges && (
            <div className="border-2 border-dashed border-black p-8 text-center">
              <p className="font-black uppercase text-sm">Click &quot;Analyse&quot; to get nudges</p>
            </div>
          )}
        </div>
      )}

      {/* Merge confirmation modal */}
      {mergingPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 translate-x-3 translate-y-3 border-4 border-black bg-yellow-300 pointer-events-none" />
            <div className="relative border-4 border-black bg-white">
              <div className="bg-yellow-300 border-b-4 border-black px-6 py-4 flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-tight">Merge Contacts</h2>
                <button type="button" onClick={() => setMergingPair(null)} aria-label="Close"
                  className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium">
                  <strong className="font-black">{mergingPair.primary.name}</strong> will be kept as the primary contact.
                  <strong className="font-black"> {mergingPair.secondary.name}</strong> will be merged into it and deleted.
                </p>
                <div className="bg-yellow-50 border-2 border-black p-3 text-xs font-bold uppercase">
                  Tags from both contacts will be combined. Empty fields on the primary will be filled from the secondary.
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMergingPair(null)} className="neo-btn-white px-5 py-2.5 text-sm flex-1">
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => mergeMutation.mutate({ primaryId: mergingPair.primary.id, secondaryId: mergingPair.secondary.id })}
                    disabled={mergeMutation.isPending}
                    className="neo-btn bg-black text-yellow-300 px-5 py-2.5 text-sm flex-1">
                    {mergeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" aria-hidden="true" />}
                    Confirm Merge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
