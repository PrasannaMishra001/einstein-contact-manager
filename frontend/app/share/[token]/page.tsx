import { sharingAPI } from "@/lib/api";
import { Phone, Mail, Building, Briefcase, MapPin, Calendar, Download } from "lucide-react";
import { formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import type { Contact } from "@/types";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-indigo-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Contact not found</h1>
          <p className="text-slate-400">This share link may have been revoked or expired.</p>
        </div>
      </div>
    );
  }

  const vcardData = `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\n${contact.phone ? `TEL:${contact.phone}\n` : ""}${contact.email ? `EMAIL:${contact.email}\n` : ""}${contact.company ? `ORG:${contact.company}\n` : ""}${contact.job_title ? `TITLE:${contact.job_title}\n` : ""}END:VCARD`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur text-center">
          {/* Avatar */}
          {contact.photo_url ? (
            <img src={contact.photo_url} alt={contact.name} className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 ${generateAvatarColor(contact.name)}`}>
              {getInitials(contact.name)}
            </div>
          )}

          <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
          {contact.job_title && <p className="text-slate-400 mt-1">{contact.job_title}</p>}
          {contact.company && <p className="text-slate-500 text-sm flex items-center justify-center gap-1 mt-1"><Building className="w-3.5 h-3.5" />{contact.company}</p>}

          <div className="my-6 space-y-3 text-left">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-brand-400 shrink-0" />{contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" />{contact.email}
              </a>
            )}
            {contact.birthday && (
              <div className="flex items-center gap-3 text-slate-300">
                <Calendar className="w-4 h-4 text-brand-400 shrink-0" />Birthday: {formatDate(contact.birthday)}
              </div>
            )}
          </div>

          <a
            href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcardData)}`}
            download={`${contact.name}.vcf`}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Add to Contacts
          </a>
        </div>
        <p className="text-center text-slate-600 text-xs mt-4">Shared via Einstein Contact Manager</p>
      </div>
    </div>
  );
}
