"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsAPI, aiAPI, ioAPI, tagsAPI } from "@/lib/api";
import Image from "next/image";
import { Star, StarOff, Pencil, Trash2, ArrowLeft, QrCode, Share2, Phone, Mail, Building, Briefcase, Calendar, MapPin, Clock, Sparkles, Copy, ExternalLink } from "lucide-react";
import { formatDate, formatDateTime, getInitials, generateAvatarColor, cn } from "@/lib/utils";
import { ContactForm } from "@/components/contacts/ContactForm";
import { QRModal } from "@/components/contacts/QRModal";
import toast from "react-hot-toast";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: () => contactsAPI.get(id).then(r => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ["contact-history", id],
    queryFn: () => contactsAPI.getHistory(id).then(r => r.data),
    enabled: !!contact,
  });

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => tagsAPI.list().then(r => r.data) });

  const delMutation = useMutation({
    mutationFn: () => contactsAPI.delete(id),
    onSuccess: () => { toast.success("Contact deleted"); router.push("/contacts"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
  });

  const favMutation = useMutation({
    mutationFn: () => contactsAPI.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact", id] }),
  });

  const handleShare = async () => {
    const { data } = await contactsAPI.createShareLink(id);
    const url = `${window.location.origin}/share/${data.share_token}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  const handleAISummary = async () => {
    setLoadingSummary(true);
    try {
      const { data } = await aiAPI.summary(id);
      setAiSummary(data.summary);
    } catch { toast.error("AI summary failed"); }
    finally { setLoadingSummary(false); }
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  );

  if (!contact) return <div className="text-center py-20 text-muted-foreground">Contact not found</div>;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {contact.photo_url ? (
                <Image src={contact.photo_url} alt={contact.name} width={80} height={80} className="rounded-2xl object-cover w-20 h-20" />
              ) : (
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold", generateAvatarColor(contact.name))}>
                  {getInitials(contact.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{contact.name}</h1>
                  {contact.is_favorite && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
                </div>
                {contact.job_title && <p className="text-muted-foreground">{contact.job_title}</p>}
                {contact.company && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building className="w-3.5 h-3.5" />{contact.company}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {contact.tags.map(t => (
                    <span key={t.id} className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: t.color }}>{t.name}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => favMutation.mutate()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm transition-colors">
                {contact.is_favorite ? <><Star className="w-4 h-4 fill-amber-400 text-amber-400" />Unfavorite</> : <><StarOff className="w-4 h-4" />Favorite</>}
              </button>
              <button onClick={() => setShowQR(true)} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="QR Code"><QrCode className="w-4 h-4" /></button>
              <button onClick={handleShare} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Share"><Share2 className="w-4 h-4" /></button>
              <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 text-sm transition-colors"><Pencil className="w-4 h-4" />Edit</button>
              <button onClick={() => { if (confirm("Delete this contact?")) delMutation.mutate(); }}
                className="p-2 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wide">Contact Details</h3>
              <div className="space-y-3">
                {contact.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-brand-500 shrink-0" /><a href={`tel:${contact.phone}`} className="hover:text-brand-500 transition-colors">{contact.phone}</a></div>}
                {contact.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-brand-500 shrink-0" /><a href={`mailto:${contact.email}`} className="hover:text-brand-500 transition-colors">{contact.email}</a></div>}
                {contact.birthday && <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-brand-500 shrink-0" /><span>Birthday: {formatDate(contact.birthday)}</span></div>}
                {contact.anniversary && <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-brand-500 shrink-0" /><span>Anniversary: {formatDate(contact.anniversary)}</span></div>}
                {contact.address && Object.values(contact.address).some(Boolean) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{[contact.address.street, contact.address.city, contact.address.state, contact.address.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {contact.notes && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wide">Notes</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500" />AI Summary</h3>
                <button onClick={handleAISummary} disabled={loadingSummary}
                  className="text-xs bg-brand-500 text-white px-3 py-1 rounded-full hover:bg-brand-600 transition-colors disabled:opacity-50">
                  {loadingSummary ? "Generating…" : "Generate"}
                </button>
              </div>
              {aiSummary ? <p className="text-sm leading-relaxed">{aiSummary}</p> : <p className="text-sm text-muted-foreground">Click generate to get an AI-written summary of this contact.</p>}
            </div>
          </div>

          {/* Right: meta + history */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wide">Meta</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span>{formatDate(contact.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{formatDate(contact.updated_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Favorite</span><span>{contact.is_favorite ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Archived</span><span>{contact.is_archived ? "Yes" : "No"}</span></div>
              </div>
            </div>

            {history && history.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wide flex items-center gap-2"><Clock className="w-3.5 h-3.5" />History</h3>
                <div className="space-y-3">
                  {history.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                      <div>
                        <span className="font-medium capitalize">{h.action}</span>
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && contact && (
        <ContactForm
          contact={contact}
          tags={tags ?? []}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); qc.invalidateQueries({ queryKey: ["contact", id] }); }}
        />
      )}
      {showQR && <QRModal contact={contact} onClose={() => setShowQR(false)} />}
    </>
  );
}
