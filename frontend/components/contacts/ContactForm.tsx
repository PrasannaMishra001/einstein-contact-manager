"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Upload, Loader2, Link2 } from "lucide-react";
import type { Contact, Tag } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  company: z.string().optional(),
  job_title: z.string().optional(),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  notes: z.string().optional(),
  is_favorite: z.boolean().default(false),
  tag_ids: z.array(z.string()).default([]),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  github: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  contact: Contact | null;
  tags: Tag[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContactForm({ contact, tags, onClose, onSuccess }: Props) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(contact?.photo_url || null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: contact ? {
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      company: contact.company ?? "",
      job_title: contact.job_title ?? "",
      birthday: contact.birthday ?? "",
      anniversary: contact.anniversary ?? "",
      notes: contact.notes ?? "",
      is_favorite: contact.is_favorite,
      tag_ids: contact.tags.map(t => t.id),
      linkedin: contact.social_links?.linkedin ?? "",
      twitter: contact.social_links?.twitter ?? "",
      instagram: contact.social_links?.instagram ?? "",
      website: contact.social_links?.website ?? "",
      github: contact.social_links?.github ?? "",
    } : { is_favorite: false, tag_ids: [] },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { linkedin, twitter, instagram, website, github, ...rest } = data;
      const social_links = { linkedin, twitter, instagram, website, github };
      const hasSocial = Object.values(social_links).some(Boolean);
      const payload = {
        ...rest,
        email: data.email || undefined,
        phone: data.phone || undefined,
        social_links: hasSocial ? social_links : undefined,
      };
      let saved: Contact;
      if (contact) {
        const { data: updated } = await contactsAPI.update(contact.id, payload);
        saved = updated;
      } else {
        const { data: created } = await contactsAPI.create(payload);
        saved = created;
      }
      if (photoFile) await contactsAPI.uploadPhoto(saved.id, photoFile);
      toast.success(contact ? "Contact updated!" : "Contact added!");
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      {/* Offset shadow */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-0 translate-x-3 translate-y-3 border-4 border-black bg-yellow-300 pointer-events-none" />
        <div className="relative border-4 border-black bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-yellow-300 sticky top-0 z-10">
            <h2 className="font-black text-lg uppercase tracking-tight">
              {contact ? "Edit Contact" : "New Contact"}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close dialog"
              className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 border-2 border-black border-dashed flex items-center justify-center overflow-hidden shrink-0 bg-yellow-50">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-black/40" />
                )}
                <input type="file" accept="image/*" onChange={handlePhoto}
                  aria-label="Upload contact photo" title="Upload contact photo"
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div>
                <p className="text-sm font-black uppercase">Contact Photo</p>
                <p className="text-xs font-bold text-black/50">Click to upload (JPG, PNG, WebP)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "name", label: "Name *", placeholder: "Full name" },
                { name: "phone", label: "Phone", placeholder: "+91 98765 43210" },
                { name: "email", label: "Email", placeholder: "email@example.com", type: "email" },
                { name: "company", label: "Company", placeholder: "Company name" },
                { name: "job_title", label: "Job Title", placeholder: "Software Engineer" },
                { name: "birthday", label: "Birthday", type: "date" },
                { name: "anniversary", label: "Anniversary", type: "date" },
              ].map(({ name, label, placeholder, type }) => (
                <div key={name}>
                  <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">{label}</label>
                  <input
                    {...register(name as keyof FormData)}
                    type={type || "text"}
                    placeholder={placeholder}
                    className="neo-input"
                  />
                  {errors[name as keyof typeof errors] && (
                    <p className="text-red-600 text-xs font-black mt-1 uppercase">
                      {errors[name as keyof typeof errors]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Notes</label>
              <textarea {...register("notes")} rows={3} placeholder="Any notes..."
                className="neo-input resize-none" />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="text-xs font-black uppercase tracking-widest mb-2 block">Tags</label>
                <Controller name="tag_ids" control={control} render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const selected = field.value.includes(tag.id);
                      return (
                        <button key={tag.id} type="button"
                          onClick={() => field.onChange(
                            selected
                              ? field.value.filter((id: string) => id !== tag.id)
                              : [...field.value, tag.id]
                          )}
                          className={`px-3 py-1 border-2 border-black text-xs font-black uppercase tracking-wide transition-all shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
                            selected ? "text-white" : "bg-white"
                          }`}
                          style={selected ? { backgroundColor: tag.color } as React.CSSProperties : undefined}>
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )} />
              </div>
            )}

            {/* Social Links */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                <label className="text-xs font-black uppercase tracking-widest">Social &amp; Profile Links <span className="font-medium normal-case tracking-normal text-black/40">(optional)</span></label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "linkedin", placeholder: "https://linkedin.com/in/..." },
                  { name: "twitter", placeholder: "https://twitter.com/..." },
                  { name: "instagram", placeholder: "https://instagram.com/..." },
                  { name: "website", placeholder: "https://..." },
                  { name: "github", placeholder: "https://github.com/..." },
                ].map(({ name, placeholder }) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase w-16 shrink-0 text-black/50 dark:text-white/40 tracking-wide">{name}</span>
                    <input {...register(name as "linkedin" | "twitter" | "instagram" | "website" | "github")}
                      placeholder={placeholder} className="neo-input text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite */}
            <label className="flex items-center gap-3 cursor-pointer">
              <Controller name="is_favorite" control={control} render={({ field }) => (
                <div className="relative">
                  <input type="checkbox" checked={field.value} onChange={field.onChange}
                    className="w-5 h-5 border-2 border-black appearance-none checked:bg-yellow-300 checked:border-black cursor-pointer" />
                  {field.value && <span className="absolute inset-0 flex items-center justify-center text-xs font-black pointer-events-none">✓</span>}
                </div>
              )} />
              <span className="text-sm font-black uppercase tracking-wide">Mark as Favorite</span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-black">
              <button type="button" onClick={onClose} className="neo-btn-white px-5 py-2.5 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="neo-btn-primary px-6 py-2.5 text-sm">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {contact ? "Save Changes" : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
