import Link from "next/link";
import { Brain, Zap, Shield, Globe, Star, ArrowRight } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Search", desc: "Ask in plain English — 'find my work contacts in Bangalore' — and get instant results." },
  { icon: Zap, title: "Real-time Sync", desc: "Changes sync instantly across all your devices via live events." },
  { icon: Shield, title: "Privacy First", desc: "Your data stays yours. Self-hostable, open source, no telemetry." },
  { icon: Globe, title: "Google Contacts Sync", desc: "Two-way sync with Google Contacts. Import, export, or keep both in perfect harmony." },
  { icon: Star, title: "Smart Duplicates", desc: "AI detects duplicate contacts and suggests intelligent merges." },
  { icon: ArrowRight, title: "Import Anything", desc: "Import from CSV, vCard (.vcf), or paste a business card and let AI fill in the fields." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-white font-semibold text-lg">Einstein</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-slate-300 hover:text-white text-sm transition-colors">Sign in</Link>
          <Link href="/register" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm mb-8">
          <Brain className="w-4 h-4" />
          AI-Powered Contact Management
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Manage contacts<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">intelligently</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Einstein brings AI-powered search, smart deduplication, Google Contacts sync, and
          beautiful analytics to your contact management workflow.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all hover:scale-105 inline-flex items-center gap-2">
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all">
            Sign in
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <p>Einstein Contact Manager — Open Source & Free</p>
      </footer>
    </div>
  );
}
