"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ioAPI, aiAPI } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2, Brain, Clipboard } from "lucide-react";
import toast from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";

type ImportResult = { added: number; skipped: number; errors: string[] };

export default function ImportPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [bcText, setBcText] = useState("");
  const [bcParsed, setBcParsed] = useState<Record<string, string> | null>(null);
  const [bcLoading, setBcLoading] = useState(false);

  const token = getAccessToken();

  const importFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const isVCard = file.name.endsWith(".vcf");
      const { data } = isVCard ? await ioAPI.importVCard(file) : await ioAPI.importCSV(file);
      setResult(data);
      toast.success(`Import complete: ${data.added} added, ${data.skipped} skipped`);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch {
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) importFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/vcard": [".vcf"] },
    multiple: false,
  });

  const parseBusinessCard = async () => {
    if (!bcText.trim()) return;
    setBcLoading(true);
    try {
      const { data } = await aiAPI.parseBusinessCard(bcText);
      setBcParsed(data.parsed as Record<string, string>);
    } catch { toast.error("Parsing failed"); }
    finally { setBcLoading(false); }
  };

  const exportUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}/api${path}?token=${token}`;
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Import & Export</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Import contacts from CSV/vCard or export your data</p>
      </div>

      {/* Import */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Upload className="w-5 h-5 text-brand-500" />Import Contacts</h2>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/40"}`}>
          <input {...getInputProps()} />
          {loading ? (
            <Loader2 className="w-10 h-10 mx-auto text-brand-500 animate-spin" />
          ) : (
            <>
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">{isDragActive ? "Drop your file here" : "Drag & drop CSV or vCard (.vcf)"}</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            </>
          )}
        </div>

        {result && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-500"><CheckCircle className="w-4 h-4" /><span className="font-medium">Import complete</span></div>
            <div className="text-sm space-y-1">
              <p>{result.added} contacts added</p>
              <p className="text-muted-foreground">{result.skipped} skipped (duplicates or errors)</p>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-amber-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{result.errors.length} errors:</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground ml-4">{e}</p>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Download className="w-5 h-5 text-brand-500" />Export Contacts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "CSV", desc: "Spreadsheet compatible", path: "/io/export/csv", ext: "csv" },
            { label: "vCard (.vcf)", desc: "Universal contact format", path: "/io/export/vcard", ext: "vcf" },
            { label: "JSON", desc: "Full data export", path: "/io/export/json", ext: "json" },
          ].map(f => (
            <a key={f.label} href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api${f.path}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-1 p-4 border border-border rounded-xl hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors cursor-pointer">
              <span className="font-medium text-sm">{f.label}</span>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </a>
          ))}
        </div>
      </div>

      {/* AI Business Card Parser */}
      <div className="bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/20 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Brain className="w-5 h-5 text-brand-500" />AI Business Card Parser</h2>
        <p className="text-sm text-muted-foreground">Paste the text from a business card and let AI extract the contact details.</p>
        <textarea value={bcText} onChange={e => setBcText(e.target.value)} rows={4}
          placeholder="John Smith&#10;Senior Engineer @ Acme Corp&#10;📞 +91 98765 43210&#10;✉ john@acme.com&#10;Bangalore, India"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button onClick={parseBusinessCard} disabled={bcLoading || !bcText.trim()}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {bcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          Parse with AI
        </button>
        {bcParsed && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-medium mb-3 text-green-500 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Parsed successfully</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(bcParsed).map(([k, v]) => v && (
                <div key={k}><span className="text-muted-foreground capitalize">{k.replace("_", " ")}: </span><span>{String(v)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
