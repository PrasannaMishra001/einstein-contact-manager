"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersAPI, contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Bell, Trash2, Plus, Loader2, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const REMINDER_COLORS: Record<string, string> = {
  birthday: "bg-pink-300",
  anniversary: "bg-purple-300",
  custom: "bg-cyan-300",
};

export default function RemindersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [type, setType] = useState("custom");
  const [message, setMessage] = useState("");
  const [remindAt, setRemindAt] = useState("");

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => remindersAPI.list().then(r => r.data),
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts-search", contactSearch],
    queryFn: () => contactsAPI.list({ search: contactSearch, per_page: 10 }).then(r => r.data.contacts),
    enabled: contactSearch.length > 1,
  });

  const addMutation = useMutation({
    mutationFn: () => remindersAPI.create(selectedContact, {
      reminder_type: type,
      message,
      remind_at: remindAt,
    } as Parameters<typeof remindersAPI.create>[1]),
    onSuccess: () => {
      toast.success("Reminder set!");
      qc.invalidateQueries({ queryKey: ["reminders"] });
      setShowAdd(false);
      setMessage("");
      setRemindAt("");
      setSelectedContact("");
      setSelectedName("");
      setContactSearch("");
    },
    onError: () => toast.error("Failed to create reminder"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => remindersAPI.delete(id),
    onSuccess: () => { toast.success("Reminder removed"); qc.invalidateQueries({ queryKey: ["reminders"] }); },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Reminders</h1>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">
            Birthday, anniversary, and custom reminders
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(!showAdd)}
          className="neo-btn-primary px-4 py-2 text-xs">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Reminder
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="neo-card animate-slide-up">
          <div className="bg-yellow-300 border-b-2 border-black px-5 py-3 flex items-center justify-between">
            <h3 className="font-black uppercase tracking-wide text-sm">New Reminder</h3>
            <button type="button" onClick={() => setShowAdd(false)} aria-label="Close form"
              className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* Contact search */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Contact</label>
              <input value={contactSearch} onChange={e => { setContactSearch(e.target.value); setSelectedContact(""); setSelectedName(""); }}
                placeholder="Search contact..." aria-label="Search for contact" className="neo-input" />
              {contacts && contacts.length > 0 && !selectedContact && (
                <div className="border-2 border-black border-t-0 bg-white">
                  {contacts.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedContact(c.id); setSelectedName(c.name); setContactSearch(c.name); }}
                      className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-yellow-50 border-b border-black/10 last:border-0">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedName && (
                <p className="text-xs font-black uppercase tracking-wide text-black/60 mt-1">
                  Selected: {selectedName}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                aria-label="Reminder type" className="neo-input">
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Date/time */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Remind at</label>
              <input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)}
                aria-label="Reminder date and time" className="neo-input" />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Message (optional)</label>
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Custom reminder message" aria-label="Reminder message" className="neo-input" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="neo-btn-white px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button"
                onClick={() => addMutation.mutate()}
                disabled={!selectedContact || !remindAt || addMutation.isPending}
                className="neo-btn-primary px-5 py-2 text-sm">
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder list */}
      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 border-2 border-black bg-yellow-100 animate-pulse" />
        ))}

        {!isLoading && !reminders?.length && (
          <div className="border-4 border-dashed border-black p-12 text-center">
            <div className="w-12 h-12 border-2 border-black bg-yellow-300 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-black uppercase tracking-wide text-sm">No reminders yet</p>
            <p className="text-xs font-medium text-black/50 mt-1">Add one to stay in touch</p>
          </div>
        )}

        {reminders?.map(r => {
          const colorCls = REMINDER_COLORS[r.reminder_type] ?? "bg-cyan-300";
          return (
            <div key={r.id} className="border-2 border-black bg-white shadow-neo-sm flex items-center overflow-hidden">
              <div className={`${colorCls} border-r-2 border-black px-3 py-4 flex items-center justify-center self-stretch`}>
                <Bell className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-sm font-black uppercase tracking-wide capitalize">{r.reminder_type}</p>
                <p className="text-xs font-medium text-black/60 mt-0.5 truncate">
                  {r.message || "No message"} &middot; {formatDateTime(r.remind_at)}
                </p>
              </div>
              <button type="button" aria-label="Delete reminder"
                onClick={() => delMutation.mutate(r.id)}
                className="neo-btn-red p-3 self-stretch border-l-2 border-black">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
