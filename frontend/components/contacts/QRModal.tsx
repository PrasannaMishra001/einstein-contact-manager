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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      {/* Offset shadow */}
      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 translate-x-3 translate-y-3 border-4 border-black bg-cyan-300 pointer-events-none" />
        <div className="relative border-4 border-black bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black bg-yellow-300">
            <div>
              <h3 className="font-black uppercase tracking-tight">QR Code</h3>
              <p className="text-xs font-black text-black/60 uppercase tracking-wide">{contact.name}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close QR code dialog" title="Close"
              className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* QR area */}
          <div className="flex items-center justify-center p-6 bg-white">
            {loading ? (
              <div className="w-48 h-48 border-2 border-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" aria-label="Loading QR code" />
              </div>
            ) : qr ? (
              <div className="border-4 border-black p-2 bg-white shadow-neo">
                <img src={qr} alt={`QR code for ${contact.name}`} className="w-44 h-44 block" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-black p-8 text-center">
                <p className="text-sm font-black uppercase text-black/50">Failed to generate QR code</p>
              </div>
            )}
          </div>

          <div className="border-t-2 border-black px-5 pb-5 pt-3 space-y-3">
            <p className="text-center text-xs font-black uppercase tracking-wide text-black/60">
              Scan to save {contact.name} as a contact (vCard)
            </p>
            {qr && (
              <button type="button" onClick={download}
                className="neo-btn-primary w-full py-2.5 text-sm">
                <Download className="w-4 h-4" aria-hidden="true" />
                Download PNG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
