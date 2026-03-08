"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BarChart2, Settings, Upload, Brain, LogOut, Moon, Sun, Menu, X, Star, Archive, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const nav = [
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/contacts?favorites=true", icon: Star, label: "Favorites" },
  { href: "/contacts?archived=true", icon: Archive, label: "Archived" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/import", icon: Upload, label: "Import / Export" },
  { href: "/reminders", icon: Bell, label: "Reminders" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm shrink-0">E</div>
        <div>
          <span className="font-semibold text-sm">Einstein</span>
          <p className="text-xs text-muted-foreground">Contact Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (pathname.startsWith(item.href.split("?")[0]) && item.href === "/contacts" && !item.href.includes("?"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-1">
        <Link href="/ai" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Brain className="w-4 h-4 shrink-0" />
          AI Tools
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-card border border-border rounded-lg p-2"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-60 bg-card border-r border-border h-full">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
