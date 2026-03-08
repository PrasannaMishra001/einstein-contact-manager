"use client";
import { useState } from "react";
import { aiAPI } from "@/lib/api";
import { Brain, Loader2, X, Sparkles } from "lucide-react";
import { ContactTable } from "./ContactTable";
import { contactsAPI } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Contact } from "@/types";

const EXAMPLES = [
  "Find my work contacts added this month",
  "Show friends with birthdays",
  "Who is my doctor or healthcare contact?",
  "Find contacts from Google",
];

export function AISearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [explanation, setExplanation] = useState("");
  const [searched, setSearched] = useState(false);
  const qc = useQueryClient();

  const search = async (q?: string) => {
    const finalQ = q ?? query;
    if (!finalQ.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await aiAPI.search(finalQ);
      setResults(data.contacts);
      setExplanation(data.explanation);
      if (!q) setQuery(finalQ);
    } catch {
      toast.error("AI search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-sm">AI Natural Language Search</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Ask anything… 'find my work contacts in Mumbai'"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button onClick={() => search()}
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Examples */}
      {!searched && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => { setQuery(ex); search(ex); }}
              className="text-xs bg-card border border-border px-3 py-1.5 rounded-full hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors text-muted-foreground hover:text-foreground">
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
          {explanation}
        </div>
      )}

      {/* Results */}
      {searched && (
        <ContactTable
          contacts={results}
          isLoading={loading}
          onEdit={() => {}}
          onDelete={async (id) => {
            await contactsAPI.delete(id);
            setResults(r => r.filter(c => c.id !== id));
            qc.invalidateQueries({ queryKey: ["contacts"] });
          }}
          onToggleFavorite={async (id) => {
            await contactsAPI.toggleFavorite(id);
            qc.invalidateQueries({ queryKey: ["contacts"] });
          }}
          page={1}
          pages={1}
          onPageChange={() => {}}
        />
      )}
    </div>
  );
}
