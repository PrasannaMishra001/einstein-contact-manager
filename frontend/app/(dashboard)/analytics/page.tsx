"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/lib/api";
import { BarChart2, Users, Star, Mail, Phone, Camera, Archive, Tag, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STAT_COLORS = [
  { bg: "bg-cyan-300", border: "border-cyan-400" },
  { bg: "bg-yellow-300", border: "border-yellow-400" },
  { bg: "bg-green-300", border: "border-green-400" },
  { bg: "bg-purple-300", border: "border-purple-400" },
  { bg: "bg-pink-300", border: "border-pink-400" },
  { bg: "bg-orange-300", border: "border-orange-400" },
  { bg: "bg-teal-300", border: "border-teal-400" },
  { bg: "bg-red-300", border: "border-red-400" },
];

const PIE_COLORS = ["#FCD34D", "#22D3EE", "#F472B6", "#FB923C", "#4ADE80", "#818CF8", "#F87171", "#2DD4BF"];

export default function AnalyticsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsAPI.get().then(r => r.data),
  });

  const stats = [
    { label: "Total Contacts", value: data?.total_contacts ?? 0, icon: Users },
    { label: "Favorites", value: data?.favorites ?? 0, icon: Star },
    { label: "With Email", value: data?.with_email ?? 0, icon: Mail },
    { label: "With Phone", value: data?.with_phone ?? 0, icon: Phone },
    { label: "With Photo", value: data?.with_photo ?? 0, icon: Camera },
    { label: "Archived", value: data?.archived ?? 0, icon: Archive },
    { label: "Tags Used", value: data?.total_tags ?? 0, icon: Tag },
    { label: "This Month", value: data?.contacts_this_month ?? 0, icon: BarChart2 },
  ];

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 border-2 border-black bg-yellow-100 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Analytics</h1>
          <p className="text-sm font-bold text-black/60 uppercase tracking-widest mt-1">
            Insights about your contact database
          </p>
        </div>
        <button type="button" onClick={() => refetch()}
          className="neo-btn-white p-2" aria-label="Refresh analytics">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const color = STAT_COLORS[i % STAT_COLORS.length];
          return (
            <div key={s.label} className="neo-card relative overflow-hidden">
              <div className={`${color.bg} border-b-2 border-black px-4 py-2 flex items-center justify-between`}>
                <span className="text-xs font-black uppercase tracking-widest">{s.label}</span>
                <s.icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="px-4 py-4">
                <p className="text-4xl font-black">{s.value.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth chart */}
        {data?.growth_chart && data.growth_chart.length > 0 && (
          <div className="neo-card">
            <div className="bg-yellow-300 border-b-2 border-black px-5 py-3">
              <h3 className="font-black uppercase tracking-wide text-sm">Contact Growth (6 months)</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.growth_chart} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#000", strokeWidth: 2 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#000", strokeWidth: 2 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ border: "2px solid #000", borderRadius: 0, background: "#fff", fontWeight: 700, boxShadow: "3px 3px 0 #000" }}
                    cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  />
                  <Bar dataKey="count" fill="#FCD34D" stroke="#000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tags pie */}
        {data?.tag_breakdown && data.tag_breakdown.length > 0 && (
          <div className="neo-card">
            <div className="bg-cyan-300 border-b-2 border-black px-5 py-3">
              <h3 className="font-black uppercase tracking-wide text-sm">Tags Breakdown</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.tag_breakdown}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    stroke="#000"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#000" }}
                  >
                    {data.tag_breakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: "2px solid #000", borderRadius: 0, background: "#fff", fontWeight: 700, boxShadow: "3px 3px 0 #000" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Completeness */}
      <div className="neo-card">
        <div className="bg-pink-300 border-b-2 border-black px-5 py-3">
          <h3 className="font-black uppercase tracking-wide text-sm">Data Completeness</h3>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "Have email", value: data ? Math.round((data.with_email / Math.max(data.total_contacts, 1)) * 100) : 0, color: "bg-cyan-300" },
            { label: "Have phone", value: data ? Math.round((data.with_phone / Math.max(data.total_contacts, 1)) * 100) : 0, color: "bg-yellow-300" },
            { label: "Have photo", value: data ? Math.round((data.with_photo / Math.max(data.total_contacts, 1)) * 100) : 0, color: "bg-pink-300" },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-black uppercase tracking-wide text-xs">{item.label}</span>
                <span className="font-black text-xs">{item.value}%</span>
              </div>
              <div className="h-4 border-2 border-black bg-white overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick numbers footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Added this week", value: data?.contacts_this_week ?? 0 },
          { label: "Google synced", value: data?.google_synced ?? 0 },
          { label: "Total tags", value: data?.total_tags ?? 0 },
          { label: "Archived", value: data?.archived ?? 0 },
        ].map(item => (
          <div key={item.label} className="border-2 border-black bg-white px-4 py-3 flex items-center justify-between shadow-neo-sm">
            <span className="text-xs font-black uppercase tracking-widest text-black/60">{item.label}</span>
            <span className="text-2xl font-black">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
