"use client";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

/**
 * Shows the local-first sync state in the contacts header:
 *   online + nothing queued  → "Synced"
 *   online + queued/flushing  → "Syncing N"
 *   offline                   → "Offline — N queued"
 */
export function SyncStatus({ online, pending }: { online: boolean; pending: number }) {
  if (!online) {
    return (
      <span className="neo-badge bg-orange-300 text-black inline-flex items-center gap-1" title="You're offline — changes are saved locally and will sync when you reconnect.">
        <CloudOff className="w-3.5 h-3.5" aria-hidden="true" />
        Offline{pending > 0 ? ` · ${pending} queued` : ""}
      </span>
    );
  }
  if (pending > 0) {
    return (
      <span className="neo-badge bg-cyan-300 text-black inline-flex items-center gap-1" title="Syncing queued changes to the server.">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        Syncing · {pending}
      </span>
    );
  }
  return (
    <span className="neo-badge bg-green-300 text-black inline-flex items-center gap-1" title="All changes saved locally and synced.">
      <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
      Synced
    </span>
  );
}
