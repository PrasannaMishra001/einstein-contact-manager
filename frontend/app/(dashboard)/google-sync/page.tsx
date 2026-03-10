"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { googleAPI } from "@/lib/api";
import {
  Cloud, RefreshCw, CheckCircle, AlertCircle, Loader2,
  Unlink, Mail, Phone, Building2, ExternalLink, Download,
  Upload, ArrowLeftRight, Check, Square, CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

type ContactStatus = "synced" | "einstein_only" | "google_only";

type GContact = {
  id?: string;
  resource_name?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  photo_url?: string;
  status: ContactStatus;
};

type StatusData = {
  synced: GContact[];
  einstein_only: GContact[];
  google_only: GContact[];
};

const STATUS_BADGE: Record<ContactStatus, { label: string; bg: string }> = {
  synced:        { label: "Synced",        bg: "bg-cyan-300"   },
  einstein_only: { label: "Einstein Only", bg: "bg-yellow-300" },
  google_only:   { label: "Google Only",   bg: "bg-green-300"  },
};

const AVATAR_COLORS = [
  "bg-yellow-300", "bg-cyan-300", "bg-pink-300",
  "bg-green-300", "bg-orange-300", "bg-purple-300",
];

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "?";
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function GoogleSyncInner() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | ContactStatus>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const e = searchParams.get("error");
    const ok = searchParams.get("connected");
    if (e) toast.error(e === "oauth_failed" ? "Google authorization failed" : "Connection error");
    if (ok) toast.success("Google account connected!");
    loadStatus();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await googleAPI.status();
      setConnected(data.connected);
      if (data.connected) await loadContacts();
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const { data } = await googleAPI.contactsWithStatus();
      setStatusData(data);
    } catch {
      toast.error("Failed to load contact status");
    }
  };

  const handleConnect = async () => {
    try {
      const { data } = await googleAPI.auth();
      window.location.href = data.auth_url;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to start OAuth";
      toast.error(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google account? Previously synced contacts remain in Google.")) return;
    try {
      await googleAPI.disconnect();
      setConnected(false);
      setStatusData(null);
      setSelected(new Set());
      toast.success("Google account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { data } = await googleAPI.sync();
      if (data.synced > 0) {
        toast.success(`${data.synced} contact${data.synced !== 1 ? "s" : ""} synced to Google!`);
      } else {
        toast("Nothing new to sync", { icon: "ℹ️" });
      }
      await loadContacts();
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleImportAll = async () => {
    setImporting(true);
    try {
      const { data } = await googleAPI.importContacts();
      if (data.added > 0) {
        toast.success(`${data.added} Google contact${data.added !== 1 ? "s" : ""} imported!`);
      } else {
        toast("All Google contacts already exist", { icon: "ℹ️" });
      }
      await loadContacts();
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleSelectiveExport = async () => {
    if (!selected.size) return;
    setExporting(true);
    try {
      const { data } = await googleAPI.selectiveExport([...selected]);
      if (data.exported > 0) {
        toast.success(`${data.exported} contact${data.exported !== 1 ? "s" : ""} exported to Google!`);
      }
      if (data.errors.length) {
        toast.error(`${data.errors.length} error${data.errors.length !== 1 ? "s" : ""} during export`);
      }
      setSelected(new Set());
      await loadContacts();
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const allContacts: GContact[] = statusData
    ? [...statusData.synced, ...statusData.einstein_only, ...statusData.google_only]
    : [];

  const displayContacts: GContact[] =
    activeTab === "all"          ? allContacts :
    activeTab === "synced"       ? (statusData?.synced        ?? []) :
    activeTab === "einstein_only"? (statusData?.einstein_only ?? []) :
                                   (statusData?.google_only   ?? []);

  const selectableContacts = (statusData?.einstein_only ?? []).filter((c) => c.id);
  const allSelected =
    selectableContacts.length > 0 && selectableContacts.every((c) => selected.has(c.id!));

  const toggleSelectAll = () => {
    setSelected(
      allSelected ? new Set() : new Set(selectableContacts.map((c) => c.id!))
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tight">Google Contacts</h1>
        <p className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/50 mt-1">
          Two-way sync — import, export &amp; track status
        </p>
      </div>

      {/* Connection card */}
      <div className="neo-card">
        <div className="bg-cyan-300 border-b-2 border-black px-5 py-3 flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <h2 className="font-black uppercase tracking-wide text-sm">Google Account</h2>
        </div>
        <div className="p-5">
          {loading && connected === null ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Checking connection…</span>
            </div>
          ) : connected ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-black bg-green-300 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase">Connected</p>
                  <p className="text-xs font-medium text-black/50 dark:text-white/50">
                    Google Contacts access granted
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="neo-btn bg-white text-black px-4 py-2 text-xs"
              >
                <Unlink className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-black/70 dark:text-white/60">
                Connect your Google account for two-way sync — import Google contacts and
                export Einstein contacts, with real-time status tracking.
              </p>
              <div className="border-2 border-black bg-yellow-50 dark:bg-yellow-950/20 p-4 text-xs font-medium space-y-1">
                <p className="font-black uppercase tracking-wide text-xs">Before connecting</p>
                <p className="text-black/60 dark:text-white/50">
                  You need <code className="bg-black/10 px-1">GOOGLE_CLIENT_ID</code> and{" "}
                  <code className="bg-black/10 px-1">GOOGLE_CLIENT_SECRET</code> set in your
                  backend .env file. Enable the People API in Google Cloud Console.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnect}
                className="neo-btn bg-black text-yellow-300 px-5 py-2.5 text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Connect Google Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connected + loaded state */}
      {connected && statusData && (
        <>
          {/* 3 action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing || statusData.einstein_only.length === 0}
              className="neo-btn bg-yellow-300 text-black px-4 py-4 text-xs flex-col h-auto gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing
                ? <Loader2 className="w-6 h-6 animate-spin" />
                : <Upload className="w-6 h-6" />}
              <span className="font-black text-sm">Sync All → Google</span>
              <span className="font-medium opacity-70">
                {statusData.einstein_only.length} Einstein-only
              </span>
            </button>

            <button
              type="button"
              onClick={handleImportAll}
              disabled={importing || statusData.google_only.length === 0}
              className="neo-btn bg-green-300 text-black px-4 py-4 text-xs flex-col h-auto gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing
                ? <Loader2 className="w-6 h-6 animate-spin" />
                : <Download className="w-6 h-6" />}
              <span className="font-black text-sm">Import All ← Google</span>
              <span className="font-medium opacity-70">
                {statusData.google_only.length} Google-only
              </span>
            </button>

            <button
              type="button"
              onClick={handleSelectiveExport}
              disabled={exporting || selected.size === 0}
              className="neo-btn bg-cyan-300 text-black px-4 py-4 text-xs flex-col h-auto gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting
                ? <Loader2 className="w-6 h-6 animate-spin" />
                : <ArrowLeftRight className="w-6 h-6" />}
              <span className="font-black text-sm">Export Selected</span>
              <span className="font-medium opacity-70">
                {selected.size} selected
              </span>
            </button>
          </div>

          {/* Status summary / tab filters */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "all",          label: "All",           count: allContacts.length,              bg: "bg-white dark:bg-neutral-800" },
              { key: "synced",       label: "Synced",        count: statusData.synced.length,        bg: "bg-cyan-300"   },
              { key: "einstein_only",label: "Einstein Only", count: statusData.einstein_only.length, bg: "bg-yellow-300" },
              { key: "google_only",  label: "Google Only",   count: statusData.google_only.length,   bg: "bg-green-300"  },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`border-2 border-black p-3 text-left transition-all
                  ${tab.bg}
                  ${activeTab === tab.key
                    ? "shadow-neo-sm translate-x-[-2px] translate-y-[-2px]"
                    : "shadow-none hover:shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  }`}
              >
                <p className="text-2xl font-black">{tab.count}</p>
                <p className="text-xs font-black uppercase tracking-wide mt-0.5 leading-tight">{tab.label}</p>
              </button>
            ))}
          </div>

          {/* Contact list */}
          <div className="neo-card">
            <div className="border-b-2 border-black px-5 py-3 flex items-center justify-between bg-white dark:bg-neutral-900">
              <h2 className="font-black uppercase tracking-wide text-sm">
                {activeTab === "all"
                  ? "All Contacts"
                  : STATUS_BADGE[activeTab as ContactStatus]?.label ?? "Contacts"}
                <span className="ml-2 border border-black bg-white dark:bg-black px-2 py-0.5 text-xs font-black">
                  {displayContacts.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {selectableContacts.length > 0 && (activeTab === "einstein_only" || activeTab === "all") && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="neo-btn bg-white dark:bg-neutral-900 text-black dark:text-white px-3 py-1.5 text-xs"
                  >
                    {allSelected
                      ? <CheckSquare className="w-3.5 h-3.5" />
                      : <Square className="w-3.5 h-3.5" />}
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadContacts}
                  className="neo-btn bg-white dark:bg-neutral-900 text-black dark:text-white px-3 py-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>

            {displayContacts.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                <p className="font-black uppercase tracking-wide text-sm">Nothing here</p>
                <p className="text-xs font-medium text-black/50 dark:text-white/40 mt-1">
                  {activeTab === "synced"
                    ? "No contacts synced yet."
                    : activeTab === "einstein_only"
                    ? "All Einstein contacts are synced to Google."
                    : activeTab === "google_only"
                    ? "All Google contacts have been imported."
                    : "No contacts found."}
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-black max-h-[600px] overflow-y-auto">
                {displayContacts.map((c, i) => {
                  const key = c.id ?? c.resource_name ?? `${c.name}-${i}`;
                  const isSelectable = c.status === "einstein_only" && !!c.id;
                  const isSelected   = isSelectable && selected.has(c.id!);
                  const badge        = STATUS_BADGE[c.status];
                  const imgKey       = `img-${key}`;
                  const hasImgError  = imgErrors.has(imgKey);

                  return (
                    <div
                      key={key}
                      onClick={() => isSelectable && toggleSelect(c.id!)}
                      className={`px-5 py-3 flex items-center gap-3 transition-colors
                        ${isSelectable ? "cursor-pointer hover:bg-yellow-50 dark:hover:bg-white/5" : "hover:bg-neutral-50 dark:hover:bg-white/5"}
                        ${isSelected ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                    >
                      {/* Checkbox */}
                      {isSelectable ? (
                        <div
                          className={`w-5 h-5 border-2 border-black flex items-center justify-center shrink-0
                            ${isSelected ? "bg-black" : "bg-white dark:bg-neutral-900"}`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      ) : (
                        <div className="w-5 shrink-0" />
                      )}

                      {/* Avatar */}
                      {c.photo_url && !hasImgError ? (
                        <div className="w-9 h-9 border-2 border-black overflow-hidden shrink-0">
                          <Image
                            src={c.photo_url}
                            alt={c.name}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                            onError={() => setImgErrors((p) => new Set(p).add(imgKey))}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-9 h-9 border-2 border-black flex items-center justify-center shrink-0 text-xs font-black ${getAvatarColor(c.name)}`}
                        >
                          {getInitials(c.name)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {c.email && (
                            <span className="flex items-center gap-1 text-xs font-medium text-black/50 dark:text-white/40">
                              <Mail className="w-3 h-3" />{c.email}
                            </span>
                          )}
                          {c.phone && (
                            <span className="flex items-center gap-1 text-xs font-medium text-black/50 dark:text-white/40">
                              <Phone className="w-3 h-3" />{c.phone}
                            </span>
                          )}
                          {c.company && (
                            <span className="flex items-center gap-1 text-xs font-medium text-black/50 dark:text-white/40">
                              <Building2 className="w-3 h-3" />{c.company}
                              {c.job_title && ` · ${c.job_title}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`border border-black px-2 py-0.5 text-xs font-black uppercase tracking-wide shrink-0 ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Loading spinner while fetching contacts */}
      {connected && !statusData && !loading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold">Loading contacts…</span>
        </div>
      )}

      {/* Not connected info */}
      {!connected && connected !== null && (
        <div className="border-2 border-black bg-white dark:bg-neutral-900 p-5 space-y-3">
          <p className="font-black uppercase tracking-wide text-xs">How it works</p>
          <ul className="space-y-2 text-black/60 dark:text-white/50 font-medium text-xs list-disc list-inside">
            <li>
              <strong className="text-black dark:text-white">Einstein Only</strong> — contact
              exists here but hasn&apos;t been pushed to Google Contacts yet
            </li>
            <li>
              <strong className="text-black dark:text-white">Google Only</strong> — contact
              exists in your Google account but hasn&apos;t been imported into Einstein
            </li>
            <li>
              <strong className="text-black dark:text-white">Synced</strong> — contact exists
              in both, linked via Google resource name
            </li>
            <li>
              Use checkboxes on Einstein-only contacts to selectively export specific ones
            </li>
          </ul>

          {/* Alert icon for unconfigured credentials */}
          <div className="flex items-start gap-2 border-2 border-black bg-orange-50 dark:bg-orange-950/20 p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-orange-600" />
            <p className="text-xs font-medium text-black/70 dark:text-white/60">
              Google OAuth must be configured in your backend .env before connecting.
              See <strong>GOOGLE_CLIENT_ID</strong>, <strong>GOOGLE_CLIENT_SECRET</strong>,
              and <strong>GOOGLE_REDIRECT_URI</strong> in ENV.md.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoogleSyncPage() {
  return (
    <Suspense>
      <GoogleSyncInner />
    </Suspense>
  );
}
