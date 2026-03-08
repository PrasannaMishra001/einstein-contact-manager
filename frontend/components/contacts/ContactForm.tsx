"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Upload, Loader2 } from "lucide-react";
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
    } : { is_favorite: false, tag_ids: [] },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { ...data, email: data.email || undefined, phone: data.phone || undefined };
      let saved: Contact;
      if (contact) {
        const { data: updated } = await contactsAPI.update(contact.id, payload);
        saved = updated;
      } else {
        const { data: created } = await contactsAPI.create(payload);
        saved = created;
      }
      if (photoFile) {
        await contactsAPI.uploadPhoto(saved.id, photoFile);
      }
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

  const inputCls = "w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-lg">{contact ? "Edit Contact" : "New Contact"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" onChange={handlePhoto}
                className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <div>
              <p className="text-sm font-medium">Contact Photo</p>
              <p className="text-xs text-muted-foreground">Click to upload (JPG, PNG, WebP)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name *</label>
              <input {...register("name")} placeholder="Full name" className={inputCls} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <input {...register("phone")} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input {...register("email")} type="email" placeholder="email@example.com" className={inputCls} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Company</label>
              <input {...register("company")} placeholder="Company name" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Job title</label>
              <input {...register("job_title")} placeholder="Software Engineer" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Birthday</label>
              <input {...register("birthday")} type="date" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Anniversary</label>
              <input {...register("anniversary")} type="date" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <textarea {...register("notes")} rows={3} placeholder="Any notes…" className={`${inputCls} resize-none`} />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <Controller name="tag_ids" control={control} render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const selected = field.value.includes(tag.id);
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => field.onChange(selected ? field.value.filter((id: string) => id !== tag.id) : [...field.value, tag.id])}
                        className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                        style={selected ? { backgroundColor: tag.color, color: "white", borderColor: tag.color } : { borderColor: "#e5e7eb" }}>
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )} />
            </div>
          )}

          {/* Favorite */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Controller name="is_favorite" control={control} render={({ field }) => (
              <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 accent-brand-500" />
            )} />
            <span className="text-sm font-medium">Mark as favorite</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border hover:bg-accent text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {contact ? "Save changes" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
