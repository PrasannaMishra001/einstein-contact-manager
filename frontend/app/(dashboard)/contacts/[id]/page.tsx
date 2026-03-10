"use client";
import { useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsAPI, aiAPI, tagsAPI } from "@/lib/api";
import Image from "next/image";
import {
  Star, Pencil, Trash2, ArrowLeft, QrCode, Share2,
  Phone, Mail, Building, Briefcase, Calendar, MapPin,
  Clock, Sparkles, Loader2, ExternalLink,
} from "lucide-react";
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
  const [photoError, setPhotoError] = useState(false);

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
    onSuccess: () => {
      toast.success("Contact deleted");
      router.push("/contacts");
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const favMutation = useMutation({
    mutationFn: () => contactsAPI.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact", id] }),
  });

  const handleShare = async () => {
    const { data } = await contactsAPI.createShareLink(id);
    const url = `${window.location.origin}/share/${data.share_token}`;
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
    <div className="space-y-4">
      <div className="h-8 border-2 border-black bg-yellow-100 animate-pulse w-32" />
      <div className="h-48 border-2 border-black bg-yellow-100 animate-pulse" />
      <div className="h-64 border-2 border-black bg-yellow-100 animate-pulse" />
    </div>
  );

  if (!contact) return (
    <div className="border-4 border-dashed border-black p-16 text-center">
      <p className="font-black uppercase text-lg">Contact not found</p>
    </div>
  );

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Back */}
        <button type="button" onClick={() => router.back()}
          className="neo-btn-white px-4 py-2 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back
        </button>

        {/* Header card */}
        <div className="neo-card overflow-hidden">
          {/* Yellow bar */}
          <div className="bg-yellow-300 border-b-4 border-black px-6 py-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {contact.photo_url && !photoError ? (
                  <Image
                    src={contact.photo_url}
                    alt={contact.name}
                    width={72}
                    height={72}
                    className="border-4 border-black object-cover w-18 h-18"
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div className={cn(
                    "w-16 h-16 border-4 border-black flex items-center justify-center text-white text-xl font-black shrink-0",
                    generateAvatarColor(contact.name)
                  )}>
                    {getInitials(contact.name)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black uppercase tracking-tight">{contact.name}</h1>
                    {contact.is_favorite && (
                      <Star className="w-5 h-5 fill-black text-black" aria-label="Favorite" />
                    )}
                  </div>
                  {contact.job_title && (
                    <p className="font-bold flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />{contact.job_title}
                    </p>
                  )}
                  {contact.company && (
                    <p className="text-sm font-bold flex items-center gap-1 text-black/70">
                      <Building className="w-3.5 h-3.5" aria-hidden="true" />{contact.company}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => favMutation.mutate()}
                  className={cn("neo-btn px-3 py-2 text-xs", contact.is_favorite ? "bg-black text-yellow-300" : "bg-white text-black")}>
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  {contact.is_favorite ? "Unfavorite" : "Favorite"}
                </button>
                <button type="button" onClick={() => setShowQR(true)} aria-label="Show QR code"
                  className="neo-btn-white p-2">
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={handleShare} aria-label="Share contact"
                  className="neo-btn-white p-2">
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setShowEdit(true)}
                  className="neo-btn-primary px-3 py-2 text-xs">
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button type="button"
                  onClick={() => { if (confirm("Delete this contact?")) delMutation.mutate(); }}
                  aria-label="Delete contact" title="Delete contact"
                  className="neo-btn-red p-2">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Tags row */}
          {contact.tags.length > 0 && (
            <div className="px-6 py-3 border-b-2 border-black bg-white flex flex-wrap gap-2">
              {contact.tags.map(t => (
                <span key={t.id}
                  className="neo-badge tag-color-bg text-black"
                  style={{ "--tag-color": t.color } as CSSProperties}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact info + notes + AI */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <div className="neo-card">
              <div className="bg-cyan-300 border-b-2 border-black px-5 py-3">
                <h3 className="font-black uppercase tracking-wide text-xs">Contact Details</h3>
              </div>
              <div className="p-5 space-y-3">
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-black bg-cyan-300 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <a href={`tel:${contact.phone}`} className="text-sm font-bold hover:underline">{contact.phone}</a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-black bg-yellow-300 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <a href={`mailto:${contact.email}`} className="text-sm font-bold hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.birthday && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-black bg-pink-300 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold">Birthday: {formatDate(contact.birthday)}</span>
                  </div>
                )}
                {contact.anniversary && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-2 border-black bg-purple-300 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold">Anniversary: {formatDate(contact.anniversary)}</span>
                  </div>
                )}
                {contact.address && Object.values(contact.address).some(Boolean) && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 border-2 border-black bg-orange-300 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold">
                      {[contact.address.street, contact.address.city, contact.address.state, contact.address.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {!contact.phone && !contact.email && !contact.birthday && !contact.anniversary && (
                  <p className="text-sm font-medium text-black/50">No contact details added.</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {contact.notes && (
              <div className="neo-card">
                <div className="bg-orange-200 border-b-2 border-black px-5 py-3">
                  <h3 className="font-black uppercase tracking-wide text-xs">Notes</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{contact.notes}</p>
                </div>
              </div>
            )}

            {/* Social Links */}
            {contact.social_links && Object.values(contact.social_links).some(Boolean) && (
              <div className="neo-card">
                <div className="bg-indigo-300 border-b-2 border-black px-5 py-3">
                  <h3 className="font-black uppercase tracking-wide text-xs">Profile Links</h3>
                </div>
                <div className="p-5 flex flex-wrap gap-3">
                  {[
                    { key: "linkedin", label: "LinkedIn", color: "bg-blue-700" },
                    { key: "twitter", label: "Twitter / X", color: "bg-sky-600" },
                    { key: "instagram", label: "Instagram", color: "bg-pink-600" },
                    { key: "website", label: "Website", color: "bg-indigo-600" },
                    { key: "github", label: "GitHub", color: "bg-neutral-800" },
                    { key: "youtube", label: "YouTube", color: "bg-red-700" },
                  ].map(({ key, label, color }) => {
                    const url = contact.social_links?.[key];
                    if (!url) return null;
                    return (
                      <a key={key} href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank" rel="noopener noreferrer"
                        className={`neo-btn ${color} text-white px-4 py-2 text-xs`}>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        {label}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div className="border-4 border-black bg-cyan-50 shadow-neo">
              <div className="bg-black border-b-4 border-black px-5 py-3 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-wide text-xs text-yellow-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  AI Summary
                </h3>
                <button type="button" onClick={handleAISummary} disabled={loadingSummary}
                  className="neo-btn bg-yellow-300 text-black px-3 py-1 text-xs">
                  {loadingSummary
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                    : "Generate"}
                </button>
              </div>
              <div className="p-4">
                {aiSummary
                  ? <p className="text-sm leading-relaxed font-medium">{aiSummary}</p>
                  : <p className="text-sm font-medium text-black/50">Click generate to get an AI-written summary of this contact.</p>}
              </div>
            </div>
          </div>

          {/* Meta + History */}
          <div className="space-y-6">
            {/* Meta */}
            <div className="neo-card">
              <div className="bg-yellow-300 border-b-2 border-black px-5 py-3">
                <h3 className="font-black uppercase tracking-wide text-xs">Meta</h3>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: "Added", value: formatDate(contact.created_at) },
                  { label: "Updated", value: formatDate(contact.updated_at) },
                  { label: "Favorite", value: contact.is_favorite ? "Yes" : "No" },
                  { label: "Archived", value: contact.is_archived ? "Yes" : "No" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm py-1.5 border-b border-black/10 last:border-0">
                    <span className="font-black text-xs uppercase tracking-wide text-black/60">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            {history && history.length > 0 && (
              <div className="neo-card">
                <div className="bg-purple-300 border-b-2 border-black px-5 py-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <h3 className="font-black uppercase tracking-wide text-xs">History</h3>
                </div>
                <div className="p-4 space-y-3">
                  {history.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2.5 h-2.5 border-2 border-black bg-yellow-300 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-black text-xs uppercase tracking-wide capitalize">{h.action}</span>
                        <p className="text-xs font-medium text-black/50 mt-0.5">{formatDateTime(h.created_at)}</p>
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
