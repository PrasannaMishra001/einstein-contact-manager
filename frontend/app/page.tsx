import Link from "next/link";
import { Brain, Zap, Shield, Globe, ArrowRight, Layers, Merge, Users, Star, Bell } from "lucide-react";

const features = [
  { icon: Brain,  title: "AI Search",            desc: "Ask in plain English — 'find my work contacts in Bangalore' — and get instant results.",            color: "bg-cyan-300",   border: "border-cyan-400"   },
  { icon: Zap,    title: "Real-time Sync",        desc: "Changes sync instantly across all your devices via live server-sent events.",                       color: "bg-yellow-300", border: "border-yellow-400" },
  { icon: Shield, title: "Privacy First",         desc: "Your data stays yours. Self-hostable, open source, zero telemetry.",                                color: "bg-green-300",  border: "border-green-400"  },
  { icon: Globe,  title: "Google Sync",           desc: "Two-way sync with Google Contacts. Import, export, or keep both in harmony.",                       color: "bg-pink-300",   border: "border-pink-400"   },
  { icon: Merge,  title: "Smart Deduplication",  desc: "Deterministic duplicate detection with AI-assisted merge. No quota wasted.",                        color: "bg-purple-300", border: "border-purple-400" },
  { icon: Layers, title: "Import Anything",       desc: "CSV, vCard, or paste a business card and let AI extract the fields for you.",                       color: "bg-orange-300", border: "border-orange-400" },
];

const stats = [
  { value: "100%", label: "Free Forever",      color: "bg-cyan-300"   },
  { value: "7+",   label: "AI Features",       color: "bg-pink-300"   },
  { value: "5min", label: "Setup Time",        color: "bg-green-300"  },
  { value: "∞",    label: "Contacts",          color: "bg-purple-300" },
];

const ticker = [
  "AI-Powered Search", "Smart Deduplication", "Google Contacts Sync",
  "Real-time Updates", "CSV & vCard Import", "QR Code Sharing",
  "Birthday Reminders", "Analytics Dashboard", "Webhook Support",
  "AI-Powered Search", "Smart Deduplication", "Google Contacts Sync",
  "Real-time Updates", "CSV & vCard Import", "QR Code Sharing",
  "Birthday Reminders", "Analytics Dashboard", "Webhook Support",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-yellow-300 dark:bg-neutral-950 text-black dark:text-white transition-colors">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="bg-grid-pattern" />
      </div>

      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="border-b-4 border-black bg-indigo-600 dark:bg-indigo-950 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-4 border-white/40 bg-yellow-300 flex items-center justify-center shadow-neo-sm">
              <Zap className="w-5 h-5 text-black" aria-hidden="true" />
            </div>
            <span className="font-black text-xl uppercase tracking-tight text-white">Einstein</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="border-2 border-white/60 bg-white/10 text-white px-4 py-2 text-sm font-black uppercase tracking-wide hover:bg-white/20 transition-all">
              Sign in
            </Link>
            <Link href="/register"
              className="border-2 border-yellow-300 bg-yellow-300 text-black px-4 py-2 text-sm font-black uppercase tracking-wide shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-1.5 text-sm font-black uppercase tracking-wide shadow-neo-sm mb-8 animate-slide-in">
          <Brain className="w-4 h-4" aria-hidden="true" />
          AI-Powered Contact Management
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 leading-none text-black dark:text-white">
          Manage contacts<br />
          <span className="bg-indigo-600 text-white px-2 inline-block animate-slide-up-1 [-webkit-text-stroke:0px]">
            intelligently
          </span>
        </h1>

        <p className="text-lg font-bold text-black dark:text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up-2">
          Einstein brings AI-powered search, smart deduplication, Google Contacts sync,
          and beautiful analytics to your contact workflow.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link href="/register"
            className="neo-shine inline-flex items-center gap-2 border-4 border-black bg-black text-yellow-300 px-8 py-4 font-black text-lg uppercase tracking-wide shadow-neo-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all">
            Start free <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
          <Link href="/login"
            className="neo-shine inline-flex items-center gap-2 border-4 border-black bg-white text-black px-8 py-4 font-black text-lg uppercase tracking-wide shadow-neo-lg hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all">
            Sign in
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`${s.color} border-4 border-black shadow-neo flex flex-col items-center py-4 px-2 hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all`}>
              <span className="text-4xl font-black tracking-tighter text-black">{s.value}</span>
              <span className="text-xs font-black uppercase tracking-widest text-black/70 mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ticker strip ───────────────────────────────── */}
      <div className="border-y-4 border-black bg-black text-yellow-300 py-3 overflow-hidden select-none">
        <div className="animate-marquee flex gap-0 whitespace-nowrap">
          {ticker.map((item, i) => (
            <span key={i} className="font-black uppercase tracking-widest text-sm px-6 shrink-0">
              {item} <span className="opacity-50 mx-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Feature grid ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-black uppercase tracking-tight text-center mb-2 text-black">
          Everything you need
        </h2>
        <p className="text-center font-bold text-black/60 mb-12 text-sm uppercase tracking-widest">
          One app · All your contacts
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`neo-shine border-4 border-black bg-white shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all animate-reveal stagger-${i}`}
            >
              <div className={`${f.color} border-b-4 border-black px-5 py-4 flex items-center gap-3`}>
                <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center shrink-0 shadow-neo-sm">
                  <f.icon className="w-4 h-4 text-black" aria-hidden="true" />
                </div>
                <span className="font-black uppercase tracking-wide text-sm text-black">{f.title}</span>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium leading-relaxed text-black/70">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ───────────────────────────────── */}
      <div className="border-y-4 border-black bg-white dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-black uppercase tracking-tight text-center mb-12 text-black dark:text-white">
            Up and running in 3 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black dark:border-white/30">
            {[
              { n: "01", color: "bg-cyan-300",   icon: Users,  title: "Create account",    desc: "Sign up free — no credit card, no email confirmation in dev." },
              { n: "02", color: "bg-pink-300",   icon: Globe,  title: "Import contacts",   desc: "Upload CSV or vCard, sync Google Contacts, or add manually." },
              { n: "03", color: "bg-green-300",  icon: Brain,  title: "Let AI work",       desc: "Search naturally, auto-tag, find duplicates, get summaries." },
            ].map((step, i) => (
              <div key={step.n} className={`${i < 2 ? "border-r-2 border-black dark:border-white/30" : ""} p-6`}>
                <div className={`${step.color} border-2 border-black w-12 h-12 flex items-center justify-center font-black text-lg shadow-neo-sm mb-4 text-black`}>
                  {step.n}
                </div>
                <h3 className="font-black uppercase tracking-wide mb-2 text-black dark:text-white">{step.title}</h3>
                <p className="text-sm font-medium text-black/60 dark:text-white/60 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Social proof strip ─────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Star,  color: "bg-yellow-300", label: "Open source", sub: "MIT License" },
            { icon: Shield, color: "bg-green-300",  label: "Self-hostable", sub: "Docker ready" },
            { icon: Bell,  color: "bg-pink-300",   label: "Reminders",    sub: "Never forget" },
            { icon: Zap,   color: "bg-purple-300", label: "Real-time",    sub: "Live updates" },
          ].map((item) => (
            <div key={item.label} className="border-2 border-black bg-white shadow-neo-sm flex items-center gap-3 px-4 py-3 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              <div className={`${item.color} border border-black w-8 h-8 flex items-center justify-center shrink-0`}>
                <item.icon className="w-4 h-4 text-black" aria-hidden="true" />
              </div>
              <div>
                <div className="font-black text-xs uppercase tracking-wide text-black">{item.label}</div>
                <div className="text-xs text-black/50 font-bold">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA banner ─────────────────────────────────── */}
      <div className="border-t-4 border-b-4 border-black bg-black py-20">
        <div className="max-w-2xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-5xl font-black uppercase tracking-tight text-yellow-300">
            Ready to get<br />organized?
          </h2>
          <p className="text-white/60 font-bold text-sm uppercase tracking-widest">
            Free forever · No credit card · Open source
          </p>
          <Link href="/register"
            className="neo-shine inline-flex items-center gap-2 border-4 border-yellow-300 bg-yellow-300 text-black px-10 py-4 font-black text-xl uppercase tracking-wide hover:bg-white hover:border-white hover:translate-x-[6px] hover:translate-y-[6px] transition-all shadow-[6px_6px_0px_0px_rgba(253,224,71,0.35)]">
            Create free account <ArrowRight className="w-6 h-6" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t-4 border-black bg-indigo-600 dark:bg-indigo-950 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-yellow-300 bg-yellow-300 flex items-center justify-center">
              <Zap className="w-3 h-3 text-black" aria-hidden="true" />
            </div>
            <span className="font-black uppercase tracking-tight text-sm text-white">Einstein</span>
          </div>
          <p className="font-black uppercase tracking-widest text-xs text-white/60">
            Open Source · MIT License · Free Forever
          </p>
          <div className="flex gap-4">
            <Link href="/login"    className="text-xs font-black uppercase tracking-wide text-white/60 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="text-xs font-black uppercase tracking-wide text-white/60 hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
