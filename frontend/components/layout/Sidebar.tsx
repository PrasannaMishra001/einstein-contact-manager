"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, BarChart2, Settings, Upload, Brain, LogOut, Moon, Sun, Menu, X, Star, Archive, Bell, Zap, Cloud } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState, Suspense } from "react";

const nav = [
  { href: "/contacts",                    icon: Users,     label: "Contacts",       color: "bg-cyan-300",   query: null },
  { href: "/contacts?favorites=true",     icon: Star,      label: "Favorites",      color: "bg-yellow-300", query: { favorites: "true" } },
  { href: "/contacts?archived=true",      icon: Archive,   label: "Archived",       color: "bg-orange-300", query: { archived: "true" } },
  { href: "/analytics",                   icon: BarChart2, label: "Analytics",      color: "bg-pink-300",   query: null },
  { href: "/import",                      icon: Upload,    label: "Import / Export", color: "bg-purple-300", query: null },
  { href: "/reminders",                   icon: Bell,      label: "Reminders",      color: "bg-green-300",  query: null },
  { href: "/google-sync",                 icon: Cloud,     label: "Google Sync",    color: "bg-cyan-300",   query: null },
  { href: "/settings",                    icon: Settings,  label: "Settings",       color: "bg-red-300",    query: null },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  function isActive(item: typeof nav[0]) {
    if (item.query) {
      // Must match pathname base AND all expected query params
      const base = item.href.split("?")[0];
      if (pathname !== base) return false;
      return Object.entries(item.query).every(([k, v]) => searchParams.get(k) === v);
    }
    // For non-query routes: exact match, but /contacts only active when no special query
    if (item.href === "/contacts") {
      return pathname === "/contacts" && !searchParams.get("favorites") && !searchParams.get("archived");
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b-4 border-black dark:border-white/20">
        <div className="w-10 h-10 border-2 border-black bg-black flex items-center justify-center shrink-0 shadow-neo-sm">
          <Zap className="w-6 h-6 text-yellow-300" />
        </div>
        <div>
          <span className="font-black text-base uppercase tracking-tight">Einstein</span>
          <p className="text-xs font-bold text-black/60 dark:text-white/50 uppercase tracking-widest">Contacts</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-black uppercase tracking-wide border-2 transition-all",
                active
                  ? "bg-black text-white border-black shadow-none translate-x-[2px] translate-y-[2px]"
                  : "border-transparent hover:border-black hover:bg-white dark:hover:bg-white/10 hover:shadow-neo-sm"
              )}
            >
              <div className={cn(
                "w-6 h-6 flex items-center justify-center border border-black shrink-0",
                active ? "bg-yellow-300" : item.color
              )}>
                <item.icon className="w-3.5 h-3.5 text-black" />
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t-4 border-black dark:border-white/20 space-y-1">
        <Link
          href="/ai"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-black uppercase tracking-wide border-2 transition-all",
            pathname === "/ai"
              ? "bg-black text-white border-black"
              : "border-transparent hover:border-black hover:bg-white dark:hover:bg-white/10 hover:shadow-neo-sm"
          )}
        >
          <div className="w-6 h-6 bg-yellow-300 border border-black flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5 text-black" />
          </div>
          AI Tools
        </Link>

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-black uppercase tracking-wide border-2 border-transparent hover:border-black hover:bg-white dark:hover:bg-white/10 hover:shadow-neo-sm transition-all"
        >
          <div className="w-6 h-6 bg-purple-300 border border-black flex items-center justify-center shrink-0">
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-black" /> : <Moon className="w-3.5 h-3.5 text-black" />}
          </div>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-black uppercase tracking-wide border-2 border-transparent hover:border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:shadow-neo-sm transition-all text-red-600"
        >
          <div className="w-6 h-6 bg-red-400 border border-black flex items-center justify-center shrink-0">
            <LogOut className="w-3.5 h-3.5 text-white" />
          </div>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 neo-sidebar sticky top-0">
        <Suspense>
          <SidebarContent />
        </Suspense>
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 border-2 border-black bg-yellow-300 flex items-center justify-center shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex animate-slide-in">
          <div className="w-64 neo-sidebar h-full">
            <Suspense>
              <SidebarContent onClose={() => setOpen(false)} />
            </Suspense>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
