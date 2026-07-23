"use client";

/**
 * Phase 0 demo — two replicas, offline edits, conflict-free convergence.
 * Public on purpose: no login, no backend, everything runs in the browser.
 * See lib/crdt/README.md for the design and docs/CRDT-OFFLINE-SYNC.md for the roadmap.
 */

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  Replica, digest, formatHLC,
  type ContactField, type MaterializedContact, type ReplicaState,
} from "@/lib/crdt";
import { Cloud, CloudOff, RefreshCw, RotateCcw, Trash2, Undo2, Zap, X } from "lucide-react";

const CONTACT_ID = "c1";
const KEY_A = "crdt-demo-A";
const KEY_B = "crdt-demo-B";

const SEED: Partial<Record<ContactField, string>> = {
  name: "Ada Lovelace",
  phone: "+91 90000 11111",
  email: "ada@analytical.dev",
  company: "Analytical Engines",
};

const EDITABLE: ContactField[] = ["name", "phone", "email", "company"];

function loadState(key: string): ReplicaState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ReplicaState) : null;
  } catch {
    return null;
  }
}

function saveState(key: string, state: ReplicaState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* quota / private mode — the demo still works in memory */
  }
}

export default function CrdtDemoPage() {
  const A = useRef<Replica | null>(null);
  const B = useRef<Replica | null>(null);
  const [mounted, setMounted] = useState(false);
  const [onlineA, setOnlineA] = useState(true);
  const [onlineB, setOnlineB] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [, force] = useReducer((n: number) => n + 1, 0);

  // Build both replicas on mount (localStorage is only available client-side,
  // so doing this in an effect also avoids any SSR/hydration mismatch).
  useEffect(() => {
    const a = new Replica("A");
    const b = new Replica("B");
    const sa = loadState(KEY_A);
    const sb = loadState(KEY_B);
    if (sa && sb) {
      a.load(sa);
      b.load(sb);
    } else {
      a.create(CONTACT_ID, SEED);
      a.addTag(CONTACT_ID, "work");
      b.merge(a.snapshot());
      saveState(KEY_A, a.state);
      saveState(KEY_B, b.state);
    }
    A.current = a;
    B.current = b;
    setMounted(true);
  }, []);

  function persist() {
    if (A.current) saveState(KEY_A, A.current.state);
    if (B.current) saveState(KEY_B, B.current.state);
  }

  function pushLog(line: string) {
    setLog((l) => [line, ...l].slice(0, 12));
  }

  /** Bidirectional anti-entropy: each side merges the other's snapshot. */
  function exchange() {
    const a = A.current, b = B.current;
    if (!a || !b) return;
    const sa = a.snapshot();
    const sb = b.snapshot();
    a.merge(sb);
    b.merge(sa);
  }

  function mutate(who: "A" | "B", fn: (r: Replica) => void, msg: string) {
    const r = who === "A" ? A.current : B.current;
    if (!r) return;
    fn(r);
    let line = `${who} · ${msg}`;
    // A live connection only exists when BOTH devices are online.
    if (onlineA && onlineB) {
      exchange();
      line += " → synced";
    } else {
      line += " → queued (offline)";
    }
    pushLog(line);
    persist();
    force();
  }

  function toggleOnline(who: "A" | "B", next: boolean) {
    const otherOnline = who === "A" ? onlineB : onlineA;
    if (who === "A") setOnlineA(next);
    else setOnlineB(next);

    if (next && otherOnline) {
      exchange();
      pushLog(`${who} · reconnected → converged`);
      persist();
      force();
    } else {
      pushLog(`${who} · went ${next ? "online" : "offline"}`);
    }
  }

  function syncNow() {
    exchange();
    pushLog("manual sync → converged");
    persist();
    force();
  }

  function resetDemo() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY_A);
      window.localStorage.removeItem(KEY_B);
    }
    const a = new Replica("A");
    const b = new Replica("B");
    a.create(CONTACT_ID, SEED);
    a.addTag(CONTACT_ID, "work");
    b.merge(a.snapshot());
    A.current = a;
    B.current = b;
    setOnlineA(true);
    setOnlineB(true);
    setLog([]);
    saveState(KEY_A, a.state);
    saveState(KEY_B, b.state);
    force();
  }

  const converged =
    mounted && A.current && B.current
      ? digest(A.current.state) === digest(B.current.state)
      : true;

  return (
    <div className="min-h-screen bg-cyan-300 dark:bg-[#0B0D14] text-black dark:text-white transition-colors">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-grid-pattern" />
      </div>

      {/* Nav */}
      <nav className="border-b-4 border-black dark:border-white/15 bg-indigo-600 dark:bg-indigo-950 relative">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-white/40 bg-yellow-300 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" aria-hidden="true" />
            </div>
            <span className="font-black uppercase tracking-tight text-white">Einstein</span>
          </Link>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/70">
            Phase 0 · CRDT sync demo
          </span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 relative">
        {/* Intro */}
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-3">
          Conflict-free offline sync
        </h1>
        <p className="max-w-3xl font-medium text-black/70 dark:text-white/65 mb-8 leading-relaxed">
          Two devices hold their own replica of the same contact. Take one offline, edit
          both, then reconnect — they converge with <strong>no conflict dialog and no lost
          write</strong>. Edits to different fields both survive; edits to the same field are
          settled deterministically by a hybrid logical clock. Your changes persist across a
          page reload, so you can genuinely leave a device &ldquo;offline&rdquo; and come back.
        </p>

        {/* Status bar */}
        <div
          className={`neo-card border-4 p-4 mb-6 flex flex-wrap items-center gap-3 justify-between ${
            converged
              ? "!bg-green-300 dark:!bg-emerald-950 border-black dark:border-emerald-500/40"
              : "!bg-orange-300 dark:!bg-orange-950 border-black dark:border-orange-500/40"
          }`}
        >
          <div className="font-black uppercase tracking-wide text-sm text-black dark:text-white">
            {converged ? "✓ Replicas converged — identical state" : "⚠ Diverged — replicas hold different state"}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={syncNow} className="neo-btn-black px-4 py-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Sync now
            </button>
            <button type="button" onClick={resetDemo} className="neo-btn-white px-4 py-2 text-xs dark:!bg-[#20242F] dark:!text-white dark:!border-white/25">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset demo
            </button>
          </div>
        </div>

        {/* Replica panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReplicaPanel
            label="Device A" accent="bg-yellow-300" online={onlineA} mounted={mounted}
            replica={A.current}
            onToggle={(v) => toggleOnline("A", v)}
            onField={(f, v) => mutate("A", (r) => r.setField(CONTACT_ID, f, v), `set ${f}`)}
            onAddTag={(t) => mutate("A", (r) => r.addTag(CONTACT_ID, t), `add tag "${t}"`)}
            onRemoveTag={(t) => mutate("A", (r) => r.removeTag(CONTACT_ID, t), `remove tag "${t}"`)}
            onDelete={() => mutate("A", (r) => r.remove(CONTACT_ID), "delete contact")}
            onRestore={() => mutate("A", (r) => r.restore(CONTACT_ID), "restore contact")}
          />
          <ReplicaPanel
            label="Device B" accent="bg-pink-300" online={onlineB} mounted={mounted}
            replica={B.current}
            onToggle={(v) => toggleOnline("B", v)}
            onField={(f, v) => mutate("B", (r) => r.setField(CONTACT_ID, f, v), `set ${f}`)}
            onAddTag={(t) => mutate("B", (r) => r.addTag(CONTACT_ID, t), `add tag "${t}"`)}
            onRemoveTag={(t) => mutate("B", (r) => r.removeTag(CONTACT_ID, t), `remove tag "${t}"`)}
            onDelete={() => mutate("B", (r) => r.remove(CONTACT_ID), "delete contact")}
            onRestore={() => mutate("B", (r) => r.restore(CONTACT_ID), "restore contact")}
          />
        </div>

        {/* Try this + log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="neo-card border-4 p-5">
            <h2 className="font-black uppercase tracking-wide mb-3 text-black dark:text-white">Try this</h2>
            <ol className="space-y-2 text-sm font-medium text-black/75 dark:text-white/70 list-decimal list-inside leading-relaxed">
              <li>Take <strong>Device B offline</strong>.</li>
              <li>On A change <strong>phone</strong>; on B change <strong>email</strong>.</li>
              <li>Bring B back online → both edits survive. No conflict.</li>
              <li>Now go offline again and change <strong>the same field</strong> on both. On
                  reconnect they agree on one value — deterministically, via the HLC stamps below each field.</li>
              <li>Offline, <strong>remove a tag on A</strong> and <strong>re-add the same tag on B</strong>.
                  On sync the tag survives — that is add-wins OR-Set semantics.</li>
            </ol>
          </div>

          <div className="neo-card border-4 p-5">
            <h2 className="font-black uppercase tracking-wide mb-3 text-black dark:text-white">Event log</h2>
            {log.length === 0 ? (
              <p className="text-sm font-medium text-black/50 dark:text-white/45">No events yet — edit a device.</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs text-black/75 dark:text-white/65">
                {log.map((l, i) => <li key={i} className="truncate">{l}</li>)}
              </ul>
            )}
          </div>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/45">
          Hand-rolled CRDT · hybrid logical clock · LWW field map · add-wins OR-Set ·
          proven by a randomized convergence test suite
        </p>
      </main>
    </div>
  );
}

function ReplicaPanel({
  label, accent, replica, online, mounted, onToggle, onField, onAddTag, onRemoveTag, onDelete, onRestore,
}: {
  label: string;
  accent: string;
  replica: Replica | null;
  online: boolean;
  mounted: boolean;
  onToggle: (v: boolean) => void;
  onField: (field: ContactField, value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [newTag, setNewTag] = useState("");

  if (!mounted || !replica) {
    return <div className="neo-card border-4 p-5 min-h-[420px] animate-pulse" aria-busy="true" />;
  }

  const doc = replica.state.docs[CONTACT_ID];
  const contact: MaterializedContact | undefined = replica.contacts()[0];
  const deleted = !contact;

  return (
    <section className="neo-card border-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b-2 border-black dark:border-white/15">
        <div className="flex items-center gap-2">
          <span className={`${accent} border-2 border-black w-8 h-8 flex items-center justify-center font-black text-black`}>
            {label.slice(-1)}
          </span>
          <span className="font-black uppercase tracking-wide text-black dark:text-white">{label}</span>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!online)}
          className={`neo-btn px-3 py-1.5 text-xs ${
            online ? "bg-green-300 text-black" : "bg-red-300 text-black"
          }`}
          aria-pressed={online}
        >
          {online ? <Cloud className="w-3.5 h-3.5" aria-hidden="true" /> : <CloudOff className="w-3.5 h-3.5" aria-hidden="true" />}
          {online ? "Online" : "Offline"}
        </button>
      </div>

      {deleted ? (
        <div className="py-10 text-center">
          <p className="font-black uppercase tracking-wide text-black/60 dark:text-white/55 mb-4">Contact deleted here</p>
          <button type="button" onClick={onRestore} className="neo-btn-cyan px-4 py-2 text-xs">
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Restore
          </button>
        </div>
      ) : (
        <>
          {/* Fields with their HLC stamps */}
          <div className="space-y-3">
            {EDITABLE.map((f) => (
              <div key={f}>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-black/60 dark:text-white/55">
                  {f}
                </label>
                <input
                  className="neo-input"
                  value={(contact[f] as string) ?? ""}
                  onChange={(e) => onField(f, e.target.value)}
                />
                <p className="mt-1 font-mono text-[10px] text-black/45 dark:text-white/40 truncate">
                  {doc?.fields[f] ? formatHLC(doc.fields[f].ts) : "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-5">
            <span className="block text-[10px] font-black uppercase tracking-widest mb-2 text-black/60 dark:text-white/55">
              Tags (add-wins set)
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              {contact.tags.length === 0 && (
                <span className="text-xs font-bold text-black/40 dark:text-white/35">none</span>
              )}
              {contact.tags.map((t) => (
                <span key={t} className="neo-badge bg-purple-300 dark:!border-white/20 flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => onRemoveTag(t)} aria-label={`Remove ${t}`}>
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="neo-input flex-1"
                placeholder="new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    onAddTag(newTag.trim());
                    setNewTag("");
                  }
                }}
              />
              <button
                type="button"
                className="neo-btn-primary px-4 text-xs"
                onClick={() => {
                  if (newTag.trim()) {
                    onAddTag(newTag.trim());
                    setNewTag("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>

          <button type="button" onClick={onDelete} className="neo-btn-red px-4 py-2 text-xs mt-5">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete contact
          </button>
        </>
      )}
    </section>
  );
}
