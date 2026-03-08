"use client";
import { useEffect, useState } from "react";
import { ioAPI } from "@/lib/api";
import { X, Download, Loader2 } from "lucide-react";
import type { Contact } from "@/types";

export function QRModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ioAPI.getQR(contact.id).then(({ data }) => {
      setQr(data.qr_code);
    }).catch(() => setQr(null)).finally(() => setLoading(false));
  }, [contact.id]);

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${contact.name}-qr.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">QR Code — {contact.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center py-4">
          {loading ? (
            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          ) : qr ? (
            <img src={qr} alt="QR Code" className="w-56 h-56 rounded-xl" />
          ) : (
            <p className="text-muted-foreground text-sm">Failed to generate QR code</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mb-4">
          Scan to add {contact.name} to contacts (vCard)
        </p>

        {qr && (
          <button onClick={download}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Download PNG
          </button>
        )}
      </div>
    </div>
  );
}
