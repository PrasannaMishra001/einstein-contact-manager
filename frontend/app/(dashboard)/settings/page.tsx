"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI, webhooksAPI, tagsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { User, Bell, Tag, Webhook, Shield, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff } from "lucide-react";
import type { Tag as TagType } from "@/types";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"profile" | "tags" | "webhooks" | "security">("profile");
  const [fullName, setFullName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#6366f1");
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

  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "tags", label: "Tags", icon: Tag },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "security", label: "Security", icon: Shield },
  ] as const;

  const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p></div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === "profile" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <div><label className="text-sm font-medium mb-1.5 block">Email</label><input value={user?.email ?? ""} disabled className={`${inputCls} opacity-60`} /></div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name</label>
            <input value={fullName || user?.full_name || ""} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="Your name" />
          </div>
          <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </button>
        </div>
      )}

      {/* Tags */}
      {tab === "tags" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Manage Tags</h2>
          <div className="flex gap-2">
            <input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="Tag name" className={`${inputCls} flex-1`} />
            <input type="color" value={tagColor} onChange={e => setTagColor(e.target.value)} className="w-12 h-10 rounded-lg border border-border cursor-pointer p-1" />
            <button onClick={() => addTagMutation.mutate()} disabled={!tagName.trim()}
              className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags?.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm" style={{ backgroundColor: t.color }}>
                {t.name}
                <button onClick={() => { if (confirm(`Delete tag "${t.name}"?`)) delTagMutation.mutate(t.id); }} className="hover:opacity-70 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks */}
      {tab === "webhooks" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">Get notified when contacts are created, updated, or deleted in your apps.</p>
          <div className="flex gap-2">
            <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://your-app.com/webhook" className={`${inputCls} flex-1`} />
            <button onClick={() => addWhMutation.mutate()} disabled={!whUrl.trim()}
              className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />Add
            </button>
          </div>
          <div className="space-y-2">
            {webhooks?.map(wh => (
              <div key={wh.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                <div>
                  <p className="text-sm font-medium truncate max-w-xs">{wh.url}</p>
                  <p className="text-xs text-muted-foreground">{wh.events.join(", ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleWhMutation.mutate(wh.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {wh.is_active ? <ToggleRight className="w-5 h-5 text-brand-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => delWhMutation.mutate(wh.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {!webhooks?.length && <p className="text-sm text-muted-foreground text-center py-4">No webhooks yet</p>}
          </div>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Change Password</h2>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Current password</label>
            <div className="relative">
              <input type={showOld ? "text" : "password"} value={oldPwd} onChange={e => setOldPwd(e.target.value)} className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">New password</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button onClick={() => changePwdMutation.mutate()} disabled={!oldPwd || newPwd.length < 8 || changePwdMutation.isPending}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {changePwdMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Update password
          </button>
        </div>
      )}
    </div>
  );
}
