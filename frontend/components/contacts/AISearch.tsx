"use client";
import { useState } from "react";
import { aiAPI, contactsAPI } from "@/lib/api";
import { Brain, Loader2, X, Sparkles, Mic, MicOff } from "lucide-react";
import { ContactTable } from "./ContactTable";
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
  const [listening, setListening] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [explanation, setExplanation] = useState("");
  const [searched, setSearched] = useState(false);
  const qc = useQueryClient();

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Voice search not supported — try Chrome or Edge"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event: { results: { [x: number]: { [x: number]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setListening(false);
      search(transcript);
    };
    recognition.onerror = () => { setListening(false); toast.error("Voice recognition failed"); };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black flex items-center justify-center">
            <Brain className="w-4 h-4 text-cyan-300" aria-hidden="true" />
          </div>
          <span className="font-black text-sm uppercase tracking-wide">AI Natural Language Search</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close AI search" title="Close AI search"
          className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Ask anything... 'find my work contacts in Mumbai'"
          aria-label="AI search query"
          className="neo-input flex-1"
        />
        <button type="button" onClick={() => search()}
          disabled={loading || !query.trim()}
          className="neo-btn bg-cyan-300 text-black px-4 py-2 text-xs">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
          Search
        </button>
        <button type="button" onClick={startVoice} disabled={listening}
          title="Voice search"
          aria-label={listening ? "Listening..." : "Start voice search"}
          className={`neo-btn px-3 py-2 text-xs ${listening ? "bg-red-400 text-white" : "bg-white text-black"}`}>
          {listening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>

      {/* Example chips */}
      {!searched && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => { setQuery(ex); search(ex); }}
              className="neo-badge bg-white text-black cursor-pointer hover:bg-yellow-50 transition-colors text-xs">
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="border-2 border-black bg-cyan-50 px-4 py-3 text-sm font-medium">
          <span className="font-black uppercase text-xs tracking-wide mr-2">AI:</span>
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
