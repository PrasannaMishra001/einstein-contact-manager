"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { googleAPI } from "@/lib/api";
import {
  Cloud, RefreshCw, CheckCircle, AlertCircle, Loader2,
  Unlink, User, Mail, Phone, Building2, ExternalLink, Download
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

type PreviewContact = {
  id: string; name: string; email?: string; phone?: string;
  company?: string; job_title?: string;
};
type SyncResult = { synced: number; errors: string[]; total: number } | null;
type ImportResult = { added: number; skipped: number; total: number } | null;

function GoogleSyncInner() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<PreviewContact[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);

  useEffect(() => {
    const e = searchParams.get("error");
    const ok = searchParams.get("connected");
    if (e) toast.error(e === "oauth_failed" ? "Google authorization failed" : "Connection error");
    if (ok) toast.success("Google account connected!");
    loadStatus();
  }, [searchParams]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await googleAPI.status();
      setConnected(data.connected);
      if (data.connected) {
        const { data: p } = await googleAPI.preview();
        setPreview(p.contacts);
        setPreviewCount(p.count);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { data } = await googleAPI.auth();
      window.location.href = data.auth_url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || "Failed to start OAuth";
      toast.error(msg);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const { data } = await googleAPI.sync();
      setResult(data);
      if (data.synced > 0) {
        toast.success(`${data.synced} contact${data.synced !== 1 ? "s" : ""} synced to Google!`);
      } else {
        toast("Nothing new to sync", { icon: "ℹ️" });
      }
      // Refresh preview
      const { data: p } = await googleAPI.preview();
      setPreview(p.contacts);
      setPreviewCount(p.count);
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await googleAPI.importContacts();
      setImportResult(data);
      if (data.added > 0) {
        toast.success(`${data.added} Google contact${data.added !== 1 ? "s" : ""} imported!`);
        qc.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        toast("All Google contacts already exist", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google account? Previously synced contacts will remain in Google Contacts.")) return;
    try {
      await googleAPI.disconnect();
      setConnected(false);
      setPreview([]);
      setPreviewCount(0);
      setResult(null);
      toast.success("Google account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tight">Google Contacts Sync</h1>
        <p className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/50 mt-1">
          Export Einstein-only contacts to your Google account
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
                Connect your Google account to push contacts from Einstein to Google Contacts.
                Only contacts <strong>not already in Google</strong> will be exported.
              </p>
              <div className="border-2 border-black bg-yellow-50 dark:bg-yellow-950/20 p-4 text-xs font-medium space-y-1">
                <p className="font-black uppercase tracking-wide text-xs">Before connecting</p>
                <p className="text-black/60 dark:text-white/50">
                  You need <code className="bg-black/10 px-1">GOOGLE_CLIENT_ID</code> and{" "}
                  <code className="bg-black/10 px-1">GOOGLE_CLIENT_SECRET</code> set in your backend{" "}
                  <code className="bg-black/10 px-1">.env</code> file. Create OAuth credentials in{" "}
                  Google Cloud Console with the People API enabled.
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

      {/* Preview */}
      {connected && (
        <div className="neo-card">
          <div className="bg-yellow-300 border-b-2 border-black px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <h2 className="font-black uppercase tracking-wide text-sm">
                Contacts to Sync
                <span className="ml-2 border border-black bg-white px-2 py-0.5 text-xs font-black">
                  {previewCount}
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || previewCount === 0}
              className="neo-btn bg-black text-yellow-300 px-4 py-2 text-xs"
            >
              {syncing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</>
                : <><Cloud className="w-3.5 h-3.5" /> Sync Now</>}
            </button>
          </div>

          {previewCount === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
              <p className="font-black uppercase tracking-wide text-sm">All caught up!</p>
              <p className="text-xs font-medium text-black/50 dark:text-white/40 mt-1">
                Every contact has already been synced to Google Contacts.
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-black max-h-96 overflow-y-auto">
              {preview.map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-yellow-50 dark:hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 border-2 border-black bg-cyan-300 flex items-center justify-center shrink-0 text-xs font-black">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
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
                  <User className="w-3.5 h-3.5 text-black/30 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sync result */}
      {result && (
        <div className="border-2 border-black">
          <div className={`border-b-2 border-black px-4 py-2 flex items-center gap-2 ${result.errors.length > 0 ? "bg-orange-300" : "bg-green-300"}`}>
            {result.errors.length > 0
              ? <AlertCircle className="w-4 h-4" />
              : <CheckCircle className="w-4 h-4" />}
            <span className="text-xs font-black uppercase tracking-wide">Sync Complete</span>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p className="font-black">{result.synced} of {result.total} contacts synced to Google</p>
            {result.errors.length > 0 && (
              <div className="mt-3 border-2 border-black bg-orange-50 dark:bg-orange-950/20 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-orange-700 mb-2">
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs font-medium text-black/60 dark:text-white/50 ml-2">{e}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import from Google */}
      {connected && (
        <div className="neo-card">
          <div className="bg-green-300 border-b-2 border-black px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <h2 className="font-black uppercase tracking-wide text-sm">Import from Google</h2>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="neo-btn bg-black text-yellow-300 px-4 py-2 text-xs"
            >
              {importing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                : <><Download className="w-3.5 h-3.5" /> Import Now</>}
            </button>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm font-medium text-black/70 dark:text-white/60">
              Pull all contacts from your Google account into Einstein. Already-imported contacts are skipped automatically.
            </p>
            {importResult && (
              <div className={`border-2 border-black p-4 ${importResult.added > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}`}>
                <p className="font-black text-sm">
                  {importResult.added} imported · {importResult.skipped} already existed · {importResult.total} total
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="border-2 border-black bg-white dark:bg-neutral-900 p-5 space-y-3 text-sm">
        <p className="font-black uppercase tracking-wide text-xs">How it works</p>
        <ul className="space-y-2 text-black/60 dark:text-white/50 font-medium text-xs list-disc list-inside">
          <li>Only contacts <strong className="text-black dark:text-white">without a Google resource name</strong> (i.e. never pushed before) are included.</li>
          <li>Each contact is created in Google Contacts via the People API.</li>
          <li>After a successful sync, the contact is marked as synced and won&apos;t be included in future runs.</li>
          <li>Archived contacts are excluded from the sync.</li>
        </ul>
      </div>
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
