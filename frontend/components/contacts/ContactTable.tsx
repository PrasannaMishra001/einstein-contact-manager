"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, StarOff, Pencil, Trash2, ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import { cn, getInitials, generateAvatarColor, formatDate } from "@/lib/utils";
import { QRModal } from "./QRModal";
import type { Contact } from "@/types";

interface Props {
  contacts: Contact[];
  isLoading: boolean;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  page: number;
  pages: number;
  onPageChange: (p: number) => void;
}

export function ContactTable({ contacts, isLoading, onEdit, onDelete, onToggleFavorite, page, pages, onPageChange }: Props) {
  const [qrContact, setQrContact] = useState<Contact | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const onImgError = (id: string) => setImgErrors(prev => new Set(prev).add(id));

  if (isLoading) {
    return (
      <div className="border-2 border-black shadow-neo">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b-2 border-black last:border-b-0 animate-shimmer">
            <div className="w-10 h-10 border-2 border-black bg-yellow-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-yellow-100 border border-black w-40" />
              <div className="h-3 bg-yellow-50 border border-black w-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!contacts.length) {
    return (
      <div className="border-2 border-black border-dashed p-16 text-center shadow-neo">
        <p className="text-xl font-black uppercase">No Contacts Found</p>
        <p className="text-sm font-bold text-black/60 mt-2">Try a different search or add a new contact.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border-2 border-black dark:border-white/20 overflow-hidden shadow-neo">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black dark:border-white/20 bg-yellow-300 dark:bg-yellow-700">
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black">Name</th>
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black hidden xl:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black hidden lg:table-cell">Tags</th>
                <th className="text-left px-4 py-3 font-black uppercase tracking-wide text-xs text-black hidden xl:table-cell">Added</th>
                <th className="text-right px-4 py-3 font-black uppercase tracking-wide text-xs text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b-2 border-black dark:border-white/10 last:border-b-0 hover:bg-yellow-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {c.photo_url && !imgErrors.has(c.id) ? (
                          <Image src={c.photo_url} alt={c.name} width={40} height={40}
                            className="w-10 h-10 object-cover border-2 border-black"
                            onError={() => onImgError(c.id)} />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 border-2 border-black flex items-center justify-center text-white text-xs font-black shrink-0",
                            generateAvatarColor(c.name)
                          )}>
                            {getInitials(c.name)}
                          </div>
                        )}
                        {c.is_favorite && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-300 border border-black flex items-center justify-center">
                            <Star className="w-2.5 h-2.5 fill-black text-black" />
                          </div>
                        )}
                      </div>
                      <Link href={`/contacts/${c.id}`} className="font-black hover:underline underline-offset-2 transition-colors">
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium hidden md:table-cell">{c.phone || <span className="text-black/30">—</span>}</td>
                  <td className="px-4 py-3 font-medium hidden lg:table-cell">{c.email || <span className="text-black/30">—</span>}</td>
                  <td className="px-4 py-3 font-medium hidden xl:table-cell">{c.company || <span className="text-black/30">—</span>}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map(t => (
                        <span key={t.id}
                          className="tag-color-bg px-2 py-0.5 border-2 border-black dark:border-white/30 text-xs font-black uppercase tracking-wide text-white"
                          style={{ "--tag-color": t.color } as React.CSSProperties}>
                          {t.name}
                        </span>
                      ))}
                      {c.tags.length > 3 && (
                        <span className="px-2 py-0.5 border-2 border-black text-xs font-black bg-yellow-300">
                          +{c.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold hidden xl:table-cell">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onToggleFavorite(c.id)}
                        className="p-1.5 border-2 border-black hover:bg-yellow-300 transition-colors"
                        title="Toggle favorite">
                        {c.is_favorite
                          ? <Star className="w-3.5 h-3.5 fill-black" />
                          : <StarOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setQrContact(c)}
                        className="p-1.5 border-2 border-black hover:bg-cyan-300 transition-colors"
                        title="QR Code">
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onEdit(c)}
                        className="p-1.5 border-2 border-black hover:bg-green-300 transition-colors"
                        title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(c.id)}
                        className="p-1.5 border-2 border-black hover:bg-red-400 hover:text-white transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t-2 border-black dark:border-white/20 bg-yellow-50 dark:bg-white/5">
            <span className="text-xs font-black uppercase">Page {page} of {pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                className="neo-btn-white px-3 py-1.5 text-xs disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onPageChange(page + 1)} disabled={page === pages}
                className="neo-btn-white px-3 py-1.5 text-xs disabled:opacity-40">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {qrContact && <QRModal contact={qrContact} onClose={() => setQrContact(null)} />}
    </>
  );
}
