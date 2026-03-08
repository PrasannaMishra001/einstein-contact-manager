"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersAPI, contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Bell, Trash2, Plus, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function RemindersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<string>("");
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
    mutationFn: () => remindersAPI.create(selectedContact, { reminder_type: type, message, remind_at: remindAt } as Parameters<typeof remindersAPI.create>[1]),
    onSuccess: () => { toast.success("Reminder set!"); qc.invalidateQueries({ queryKey: ["reminders"] }); setShowAdd(false); setMessage(""); setRemindAt(""); },
    onError: () => toast.error("Failed to create reminder"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => remindersAPI.delete(id),
    onSuccess: () => { toast.success("Reminder removed"); qc.invalidateQueries({ queryKey: ["reminders"] }); },
  });

  const inputCls = "w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Reminders</h1><p className="text-muted-foreground text-sm mt-0.5">Birthday, anniversary, and custom reminders</p></div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" />Add Reminder
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">New Reminder</h3>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Contact</label>
            <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contact…" className={inputCls} />
            {contacts && contacts.length > 0 && !selectedContact && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                {contacts.map(c => (
                  <button key={c.id} onClick={() => { setSelectedContact(c.id); setContactSearch(c.name); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">{c.name}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              <option value="birthday">Birthday</option>
              <option value="anniversary">Anniversary</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Remind at</label>
            <input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Message (optional)</label>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Custom reminder message" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">Cancel</button>
            <button onClick={() => addMutation.mutate()} disabled={!selectedContact || !remindAt || addMutation.isPending}
              className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        {!isLoading && !reminders?.length && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No reminders yet. Add one to stay in touch.</p>
          </div>
        )}
        {reminders?.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-brand-500 shrink-0" />
              <div>
                <p className="text-sm font-medium capitalize">{r.reminder_type}</p>
                <p className="text-xs text-muted-foreground">{r.message || "No message"} · {formatDateTime(r.remind_at)}</p>
              </div>
            </div>
            <button onClick={() => delMutation.mutate(r.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
