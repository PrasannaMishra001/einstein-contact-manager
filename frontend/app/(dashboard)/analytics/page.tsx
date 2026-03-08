"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/lib/api";
import { BarChart2, Users, Star, Mail, Phone, Camera, Archive, Tag, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function AnalyticsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsAPI.get().then(r => r.data),
  });

  const stats = [
    { label: "Total Contacts", value: data?.total_contacts ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Favorites", value: data?.favorites ?? 0, icon: Star, color: "text-amber-500" },
    { label: "With Email", value: data?.with_email ?? 0, icon: Mail, color: "text-green-500" },
    { label: "With Phone", value: data?.with_phone ?? 0, icon: Phone, color: "text-purple-500" },
    { label: "With Photo", value: data?.with_photo ?? 0, icon: Camera, color: "text-pink-500" },
    { label: "Archived", value: data?.archived ?? 0, icon: Archive, color: "text-orange-500" },
    { label: "Tags Used", value: data?.total_tags ?? 0, icon: Tag, color: "text-teal-500" },
    { label: "This Month", value: data?.contacts_this_month ?? 0, icon: BarChart2, color: "text-brand-500" },
  ];

  const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#f97316"];

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Insights about your contact database</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth chart */}
        {data?.growth_chart && data.growth_chart.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-5">Contact Growth (6 months)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.growth_chart} barSize={24}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tags pie */}
        {data?.tag_breakdown && data.tag_breakdown.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-5">Tags Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.tag_breakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.tag_breakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Completeness</h3>
        <div className="space-y-3">
          {[
            { label: "Have email", value: data ? Math.round((data.with_email / Math.max(data.total_contacts, 1)) * 100) : 0 },
            { label: "Have phone", value: data ? Math.round((data.with_phone / Math.max(data.total_contacts, 1)) * 100) : 0 },
            { label: "Have photo", value: data ? Math.round((data.with_photo / Math.max(data.total_contacts, 1)) * 100) : 0 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
