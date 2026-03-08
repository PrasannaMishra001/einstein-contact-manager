"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, StarOff, Pencil, Trash2, ChevronLeft, ChevronRight, MoreHorizontal, QrCode, Share2 } from "lucide-react";
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!contacts.length) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
        <p className="text-lg font-medium">No contacts found</p>
        <p className="text-sm mt-1">Try a different search or add a new contact.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Added</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {c.photo_url ? (
                          <Image src={c.photo_url} alt={c.name} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
                        ) : (
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0", generateAvatarColor(c.name))}>
                            {getInitials(c.name)}
                          </div>
                        )}
                        {c.is_favorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400 absolute -top-0.5 -right-0.5" />}
                      </div>
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:text-brand-500 transition-colors">
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{c.company || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
                          {t.name}
                        </span>
                      ))}
                      {c.tags.length > 3 && <span className="text-xs text-muted-foreground">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onToggleFavorite(c.id)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-amber-400" title="Toggle favorite">
                        {c.is_favorite ? <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> : <StarOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setQrContact(c)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="QR Code">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground" title="Delete">
                        <Trash2 className="w-4 h-4" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => onPageChange(page + 1)} disabled={page === pages}
                className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {qrContact && <QRModal contact={qrContact} onClose={() => setQrContact(null)} />}
    </>
  );
}
