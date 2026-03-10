import { sharingAPI } from "@/lib/api";
import { Phone, Mail, Building, Briefcase, Calendar, Download, MapPin } from "lucide-react";
import { formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import type { Contact } from "@/types";
import { cn } from "@/lib/utils";

async function getSharedContact(token: string): Promise<Contact | null> {
  try {
    const { data } = await sharingAPI.getShared(token);
    return data;
  } catch {
    return null;
  }
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const contact = await getSharedContact(params.token);

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-300 relative overflow-hidden">
        <div className="bg-grid-pattern" aria-hidden="true" />
        <div className="relative border-4 border-black bg-white shadow-neo-xl p-12 text-center max-w-sm mx-4">
          <div className="w-16 h-16 border-4 border-black bg-red-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black">!</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Not Found</h1>
          <p className="text-sm font-medium text-black/60">This share link may have been revoked or expired.</p>
        </div>
      </div>
    );
  }

  const vcardLines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.name}`,
    contact.phone ? `TEL:${contact.phone}` : null,
    contact.email ? `EMAIL:${contact.email}` : null,
    contact.company ? `ORG:${contact.company}` : null,
    contact.job_title ? `TITLE:${contact.job_title}` : null,
    "END:VCARD",
  ].filter(Boolean).join("\n");

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-300 relative overflow-hidden p-4">
      <div className="bg-grid-pattern" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        {/* Offset shadow effect */}
        <div className="relative">
          <div className="absolute inset-0 translate-x-4 translate-y-4 border-4 border-black bg-cyan-300 pointer-events-none" />
          <div className="relative border-4 border-black bg-white">
            {/* Yellow header bar */}
            <div className="bg-yellow-300 border-b-4 border-black px-6 py-5 text-center">
              {/* Avatar */}
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={contact.name}
                  className="w-20 h-20 border-4 border-black object-cover mx-auto mb-3"
                />
              ) : (
                <div className={cn(
                  "w-20 h-20 border-4 border-black flex items-center justify-center text-white text-2xl font-black mx-auto mb-3",
                  generateAvatarColor(contact.name)
                )}>
                  {getInitials(contact.name)}
                </div>
              )}
              <h1 className="text-2xl font-black uppercase tracking-tight">{contact.name}</h1>
              {contact.job_title && (
                <p className="text-sm font-bold flex items-center justify-center gap-1 mt-1">
                  <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                  {contact.job_title}
                </p>
              )}
              {contact.company && (
                <p className="text-xs font-black text-black/60 flex items-center justify-center gap-1 mt-0.5 uppercase tracking-wide">
                  <Building className="w-3.5 h-3.5" aria-hidden="true" />
                  {contact.company}
                </p>
              )}
            </div>

            {/* Contact details */}
            <div className="p-5 space-y-2">
              {contact.phone && (
                <a href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 border-2 border-black bg-cyan-50 px-3 py-2.5 hover:bg-cyan-300 transition-colors">
                  <div className="w-7 h-7 border-2 border-black bg-cyan-300 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black">{contact.phone}</span>
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 border-2 border-black bg-yellow-50 px-3 py-2.5 hover:bg-yellow-300 transition-colors">
                  <div className="w-7 h-7 border-2 border-black bg-yellow-300 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black">{contact.email}</span>
                </a>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-3 border-2 border-black bg-pink-50 px-3 py-2.5">
                  <div className="w-7 h-7 border-2 border-black bg-pink-300 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black">Birthday: {formatDate(contact.birthday)}</span>
                </div>
              )}
              {contact.address && Object.values(contact.address).some(Boolean) && (
                <div className="flex items-center gap-3 border-2 border-black bg-orange-50 px-3 py-2.5">
                  <div className="w-7 h-7 border-2 border-black bg-orange-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black">
                    {[contact.address.city, contact.address.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Download vCard */}
            <div className="px-5 pb-5">
              <a
                href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcardLines)}`}
                download={`${contact.name}.vcf`}
                className="w-full flex items-center justify-center gap-2 border-4 border-black bg-black text-yellow-300 py-3 font-black uppercase tracking-wide text-sm shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Add to Contacts
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-xs font-black uppercase tracking-widest text-black/50 mt-6">
          Shared via Einstein Contact Manager
        </p>
      </div>
    </div>
  );
}
