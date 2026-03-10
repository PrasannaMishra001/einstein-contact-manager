"use client";
import { useState, type ElementType, type CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI, webhooksAPI, tagsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { User, Tag, Webhook, Shield, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "profile" | "tags" | "webhooks" | "security";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("profile");
  const [fullName, setFullName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#FCD34D");
  const [whUrl, setWhUrl] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => authAPI.me().then(r => r.data) });
  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => tagsAPI.list().then(r => r.data) });
  const { data: webhooks } = useQuery({ queryKey: ["webhooks"], queryFn: () => webhooksAPI.list().then(r => r.data) });

  const updateMutation = useMutation({
    mutationFn: () => authAPI.updateMe({ full_name: fullName }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["me"] }); },
  });

  const addTagMutation = useMutation({
    mutationFn: () => tagsAPI.create(tagName, tagColor),
    onSuccess: () => { toast.success("Tag created"); qc.invalidateQueries({ queryKey: ["tags"] }); setTagName(""); },
    onError: () => toast.error("Tag already exists"),
  });

  const delTagMutation = useMutation({
    mutationFn: (id: string) => tagsAPI.delete(id),
    onSuccess: () => { toast.success("Tag deleted"); qc.invalidateQueries({ queryKey: ["tags"] }); },
  });

  const addWhMutation = useMutation({
    mutationFn: () => webhooksAPI.create({ url: whUrl, events: ["contact.created", "contact.updated", "contact.deleted"] }),
    onSuccess: () => { toast.success("Webhook added"); qc.invalidateQueries({ queryKey: ["webhooks"] }); setWhUrl(""); },
  });

  const toggleWhMutation = useMutation({
    mutationFn: (id: string) => webhooksAPI.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const delWhMutation = useMutation({
    mutationFn: (id: string) => webhooksAPI.delete(id),
    onSuccess: () => { toast.success("Webhook removed"); qc.invalidateQueries({ queryKey: ["webhooks"] }); },
  });

  const changePwdMutation = useMutation({
    mutationFn: () => authAPI.changePassword(oldPwd, newPwd),
    onSuccess: () => { toast.success("Password changed"); setOldPwd(""); setNewPwd(""); },
    onError: () => toast.error("Current password incorrect"),
  });

  const TABS: { id: TabId; label: string; icon: ElementType; color: string }[] = [
    { id: "profile", label: "Profile", icon: User, color: "bg-cyan-300" },
    { id: "tags", label: "Tags", icon: Tag, color: "bg-yellow-300" },
    { id: "webhooks", label: "Webhooks", icon: Webhook, color: "bg-pink-300" },
    { id: "security", label: "Security", icon: Shield, color: "bg-orange-300" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tight">Settings</h1>
        <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">Manage your account and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-2 border-black overflow-hidden shadow-neo-sm">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 flex-1 justify-center px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-all border-r-2 border-black last:border-r-0",
              tab === t.id ? `${t.color}` : "bg-white hover:bg-yellow-50"
            )}>
            <t.icon className="w-3.5 h-3.5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === "profile" && (
        <div className="neo-card">
          <div className="bg-cyan-300 border-b-2 border-black px-5 py-3">
            <h2 className="font-black uppercase tracking-wide text-sm">Profile</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Email</label>
              <input value={user?.email ?? ""} disabled aria-label="Email address (read only)"
                className="neo-input opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Full name</label>
              <input value={fullName || user?.full_name || ""} onChange={e => setFullName(e.target.value)}
                placeholder="Your name" aria-label="Full name" className="neo-input" />
            </div>
            <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
              className="neo-btn-primary px-5 py-2.5 text-sm">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Tags */}
      {tab === "tags" && (
        <div className="neo-card">
          <div className="bg-yellow-300 border-b-2 border-black px-5 py-3">
            <h2 className="font-black uppercase tracking-wide text-sm">Manage Tags</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <input value={tagName} onChange={e => setTagName(e.target.value)}
                placeholder="Tag name" aria-label="New tag name" className="neo-input flex-1" />
              <div className="border-2 border-black shadow-neo-sm overflow-hidden">
                <input type="color" value={tagColor} onChange={e => setTagColor(e.target.value)}
                  aria-label="Tag color" className="w-11 h-full cursor-pointer block p-0.5 bg-white" />
              </div>
              <button type="button" onClick={() => addTagMutation.mutate()} disabled={!tagName.trim()}
                className="neo-btn-primary px-4 py-2 text-xs">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {tags?.map(t => (
                <div key={t.id} className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-sm font-black shadow-neo-sm tag-color-bg"
                  style={{ "--tag-color": t.color } as CSSProperties}>
                  <span className="text-black">{t.name}</span>
                  <button type="button" aria-label={`Delete tag ${t.name}`}
                    onClick={() => { if (confirm(`Delete tag "${t.name}"?`)) delTagMutation.mutate(t.id); }}
                    className="hover:opacity-60 transition-opacity ml-1">
                    <Trash2 className="w-3 h-3 text-black" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {!tags?.length && <p className="text-sm font-medium text-black/50">No tags yet. Create one above.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks */}
      {tab === "webhooks" && (
        <div className="neo-card">
          <div className="bg-pink-300 border-b-2 border-black px-5 py-3">
            <h2 className="font-black uppercase tracking-wide text-sm">Webhooks</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm font-medium">Get notified when contacts are created, updated, or deleted in external apps.</p>
            <div className="flex gap-2">
              <input value={whUrl} onChange={e => setWhUrl(e.target.value)}
                placeholder="https://your-app.com/webhook" aria-label="Webhook URL" className="neo-input flex-1" />
              <button type="button" onClick={() => addWhMutation.mutate()} disabled={!whUrl.trim()}
                className="neo-btn-primary px-4 py-2 text-xs">
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {webhooks?.map(wh => (
                <div key={wh.id} className="flex items-center justify-between border-2 border-black p-3 bg-white shadow-neo-sm">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-black truncate max-w-xs">{wh.url}</p>
                    <p className="text-xs font-medium text-black/50 mt-0.5">{wh.events.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" aria-label={wh.is_active ? "Disable webhook" : "Enable webhook"}
                      onClick={() => toggleWhMutation.mutate(wh.id)} className="transition-colors">
                      {wh.is_active
                        ? <ToggleRight className="w-6 h-6 text-green-600" aria-hidden="true" />
                        : <ToggleLeft className="w-6 h-6 text-black/40" aria-hidden="true" />}
                    </button>
                    <button type="button" aria-label="Delete webhook"
                      onClick={() => delWhMutation.mutate(wh.id)}
                      className="neo-btn-red p-1.5 text-xs">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              {!webhooks?.length && (
                <div className="border-2 border-dashed border-black p-6 text-center">
                  <p className="text-sm font-black uppercase text-black/50">No webhooks yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="neo-card">
          <div className="bg-orange-300 border-b-2 border-black px-5 py-3">
            <h2 className="font-black uppercase tracking-wide text-sm">Change Password</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Current password</label>
              <div className="relative">
                <input type={showOld ? "text" : "password"} value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                  aria-label="Current password" className="neo-input pr-10" />
                <button type="button" onClick={() => setShowOld(!showOld)} aria-label={showOld ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors">
                  {showOld ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">New password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  aria-label="New password" className="neo-input pr-10" />
                <button type="button" onClick={() => setShowNew(!showNew)} aria-label={showNew ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              {newPwd.length > 0 && newPwd.length < 8 && (
                <p className="text-xs font-black text-red-600 uppercase mt-1">Minimum 8 characters</p>
              )}
            </div>
            <button type="button"
              onClick={() => changePwdMutation.mutate()}
              disabled={!oldPwd || newPwd.length < 8 || changePwdMutation.isPending}
              className="neo-btn bg-orange-300 text-black px-5 py-2.5 text-sm">
              {changePwdMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
