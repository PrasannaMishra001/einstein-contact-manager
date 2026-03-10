"use client";
import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { ioAPI, aiAPI } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2, Brain, Camera, ScanLine, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";
import { contactsAPI } from "@/lib/api";
import type { ContactCreate } from "@/types";

type ImportResult = { added: number; skipped: number; errors: string[] };

export default function ImportPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [bcText, setBcText] = useState("");
  const [bcParsed, setBcParsed] = useState<Record<string, string> | null>(null);
  const [bcLoading, setBcLoading] = useState(false);
  const [ocrParsed, setOcrParsed] = useState<Partial<ContactCreate> | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrPhone, setOcrPhone] = useState("");
  const [ocrSaved, setOcrSaved] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const token = getAccessToken();
  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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

  const parseOCR = async (file: File) => {
    setOcrLoading(true);
    setOcrParsed(null);
    setOcrSaved(false);
    setOcrPhone("");
    try {
      const { data } = await aiAPI.parseBusinessCardPhoto(file);
      setOcrParsed(data.parsed);
      toast.success("ID / card scanned successfully");
    } catch { toast.error("OCR failed — check Gemini API key"); }
    finally { setOcrLoading(false); }
  };

  const saveOCRAsContact = async () => {
    if (!ocrParsed) return;
    const name = ocrParsed.name;
    if (!name) { toast.error("No name detected — cannot save contact"); return; }
    const phone = ocrParsed.phone || ocrPhone.trim();
    if (!phone && !ocrParsed.email) {
      toast.error("Please enter at least a phone number to save");
      return;
    }
    setOcrSaving(true);
    try {
      await contactsAPI.create({ ...ocrParsed, name, phone: phone || undefined });
      toast.success(`${name} added to contacts!`);
      setOcrSaved(true);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch { toast.error("Failed to save contact"); }
    finally { setOcrSaving(false); }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tight">Import &amp; Export</h1>
        <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">
          Import contacts from CSV/vCard or export your data
        </p>
      </div>

      {/* Import */}
      <div className="neo-card">
        <div className="bg-cyan-300 border-b-2 border-black px-5 py-3 flex items-center gap-2">
          <Upload className="w-4 h-4" aria-hidden="true" />
          <h2 className="font-black uppercase tracking-wide text-sm">Import Contacts</h2>
        </div>
        <div className="p-5 space-y-4">
          <div {...getRootProps()}
            className={`border-4 border-dashed border-black p-10 text-center cursor-pointer transition-all ${
              isDragActive ? "bg-yellow-300 shadow-neo" : "bg-white hover:bg-yellow-50"
            }`}>
            <input {...getInputProps()} />
            {loading ? (
              <Loader2 className="w-10 h-10 mx-auto animate-spin" aria-label="Importing..." />
            ) : (
              <>
                <div className="w-12 h-12 border-2 border-black bg-yellow-300 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="font-black uppercase tracking-wide text-sm">
                  {isDragActive ? "Drop your file here" : "Drag & drop CSV or vCard (.vcf)"}
                </p>
                <p className="text-xs font-medium text-black/50 mt-1">or click to browse</p>
              </>
            )}
          </div>

          {result && (
            <div className="border-2 border-black bg-green-50">
              <div className="bg-green-300 border-b-2 border-black px-4 py-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-wide">Import Complete</span>
              </div>
              <div className="p-4 space-y-1 text-sm">
                <p className="font-black">{result.added} contacts added</p>
                <p className="font-medium text-black/60">{result.skipped} skipped (duplicates or errors)</p>
                {result.errors.length > 0 && (
                  <div className="mt-3 border-2 border-black bg-orange-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wide flex items-center gap-1 text-orange-700 mb-2">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      {result.errors.length} errors:
                    </p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs font-medium text-black/60 ml-4">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="neo-card">
        <div className="bg-yellow-300 border-b-2 border-black px-5 py-3 flex items-center gap-2">
          <Download className="w-4 h-4" aria-hidden="true" />
          <h2 className="font-black uppercase tracking-wide text-sm">Export Contacts</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "CSV", desc: "Spreadsheet compatible", path: "/io/export/csv" },
              { label: "vCard (.vcf)", desc: "Universal contact format", path: "/io/export/vcard" },
              { label: "JSON", desc: "Full data export", path: "/io/export/json" },
            ].map(f => (
              <a key={f.label}
                href={`${BASE}/api${f.path}`}
                target="_blank" rel="noopener noreferrer"
                className="neo-btn-white flex-col items-start gap-1 px-4 py-4 text-left">
                <span className="font-black text-sm uppercase">{f.label}</span>
                <span className="text-xs font-medium text-black/50 normal-case tracking-normal">{f.desc}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* AI Business Card Parser */}
      <div className="border-4 border-black bg-cyan-50 shadow-neo">
        <div className="bg-black border-b-4 border-black px-5 py-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-yellow-300" aria-hidden="true" />
          <h2 className="font-black uppercase tracking-wide text-sm text-yellow-300">AI Business Card Parser</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium">Paste text from a business card and let AI extract the contact details.</p>
          <textarea
            value={bcText}
            onChange={e => setBcText(e.target.value)}
            rows={4}
            aria-label="Business card text"
            placeholder={"Rahul Sharma\nSenior Engineer @ Infosys Ltd\n+91 98765 43210\nrahul.sharma@infosys.com\nBangalore, Karnataka"}
            className="neo-input resize-none"
          />
          <button type="button" onClick={parseBusinessCard} disabled={bcLoading || !bcText.trim()}
            className="neo-btn bg-black text-yellow-300 px-5 py-2.5 text-sm">
            {bcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" aria-hidden="true" />}
            Parse with AI
          </button>

          {bcParsed && (
            <div className="border-2 border-black bg-white">
              <div className="bg-green-300 border-b-2 border-black px-4 py-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-wide">Parsed Successfully</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(bcParsed).map(([k, v]) => v && (
                  <div key={k}>
                    <span className="text-xs font-black uppercase tracking-wide text-black/50 capitalize">
                      {k.replace("_", " ")}:{" "}
                    </span>
                    <span className="font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ID Card / Photo OCR */}
      <div className="border-4 border-black bg-purple-50 shadow-neo">
        <div className="bg-purple-400 border-b-4 border-black px-5 py-3 flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-black" aria-hidden="true" />
          <h2 className="font-black uppercase tracking-wide text-sm text-black">ID Card / Photo OCR</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-black/70">
            Upload a photo of an Aadhaar, PAN, visiting card, or any ID — Gemini AI will extract the contact details.
          </p>

          <input
            ref={ocrInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload ID card or photo for OCR"
            title="Upload ID card or photo"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) parseOCR(e.target.files[0]); }}
          />

          <button
            type="button"
            onClick={() => ocrInputRef.current?.click()}
            disabled={ocrLoading}
            className="neo-btn bg-purple-400 text-black border-black px-5 py-2.5 text-sm"
          >
            {ocrLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
              : <><Camera className="w-4 h-4" aria-hidden="true" /> Upload ID / Photo</>}
          </button>

          {ocrParsed && (
            <div className="border-2 border-black bg-white dark:bg-neutral-900">
              <div className="bg-green-300 border-b-2 border-black px-4 py-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-wide">Extracted Successfully</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(ocrParsed).map(([k, v]) => v && (
                  <div key={k}>
                    <span className="text-xs font-black uppercase tracking-wide text-black/50 dark:text-white/40 capitalize">
                      {k.replace(/_/g, " ")}:{" "}
                    </span>
                    <span className="font-bold">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
              {/* Save as contact */}
              {!ocrSaved ? (
                <div className="px-4 pb-4 space-y-3 border-t-2 border-black pt-3">
                  {!ocrParsed.phone && !ocrParsed.email && (
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest block mb-1">
                        Phone <span className="text-red-600">*</span>
                        <span className="font-medium normal-case tracking-normal text-black/40 ml-1">(required to save)</span>
                      </label>
                      <input
                        value={ocrPhone}
                        onChange={e => setOcrPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="neo-input text-sm"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={saveOCRAsContact}
                    disabled={ocrSaving}
                    className="neo-btn bg-purple-400 text-black border-black px-5 py-2.5 text-sm"
                  >
                    {ocrSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><UserPlus className="w-4 h-4" aria-hidden="true" /> Save as Contact</>}
                  </button>
                </div>
              ) : (
                <div className="px-4 pb-4 flex items-center gap-2 text-green-700 text-sm font-black">
                  <CheckCircle className="w-4 h-4" />
                  Contact saved successfully!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
