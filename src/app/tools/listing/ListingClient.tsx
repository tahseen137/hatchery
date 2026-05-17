"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type Platform = "chrome-web-store" | "app-store" | "play-store" | "product-hunt";
type GenStatus = "idle" | "streaming" | "done" | "error";

const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: "chrome-web-store", label: "Chrome Web Store", emoji: "🌐" },
  { id: "app-store", label: "App Store", emoji: "🍎" },
  { id: "play-store", label: "Play Store", emoji: "🤖" },
  { id: "product-hunt", label: "Product Hunt", emoji: "🐱" },
];

const CHAR_LIMITS: Record<Platform, Record<string, number>> = {
  "chrome-web-store": { name: 45, shortDescription: 132, description: 1000 },
  "app-store": { name: 30, subtitle: 30, description: 4000, keywords: 100 },
  "play-store": { title: 50, shortDescription: 80, fullDescription: 4000 },
  "product-hunt": { tagline: 60 },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name", shortDescription: "Short Description", description: "Description",
  category: "Category", subtitle: "Subtitle", keywords: "Keywords",
  title: "Title", fullDescription: "Full Description",
  tagline: "Tagline", firstComment: "First Comment",
};

const PRODUCT_TYPES = ["Chrome Extension", "Web App", "Mobile App", "CLI / Dev Tool", "Other"];
const TARGET_USERS = ["Developers", "Indie Founders", "Small Businesses", "Consumers", "Other"];

export default function ListingClient() {
  const searchParams = useSearchParams();

  const [platform, setPlatform] = useState<Platform>("product-hunt");
  const [productName, setProductName] = useState(searchParams.get("productName") ?? "");
  const [oneLiner, setOneLiner] = useState(searchParams.get("oneLiner") ?? "");
  const [targetUser, setTargetUser] = useState(searchParams.get("targetUser") ?? "");
  const [productType, setProductType] = useState(searchParams.get("productType") ?? "");
  const [status, setStatus] = useState<GenStatus>("idle");
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setStatus("streaming");
    setResult(null);
    try {
      const resp = await fetch("/api/listing-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, productName, oneLiner, targetUser, productType }),
      });
      if (!resp.ok || !resp.body) { setStatus("error"); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() ?? "";
        for (const part of parts) {
          const dataLine = part.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          const data = dataLine.slice(6);
          if (data === "[DONE]") {
            try {
              const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
              if (!jsonMatch) throw new Error("no JSON");
              setResult(JSON.parse(jsonMatch[0]));
              setStatus("done");
            } catch {
              setStatus("error");
            }
            return;
          }
          try {
            accumulated += JSON.parse(data) as string;
          } catch { /* skip */ }
        }
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }, [platform, productName, oneLiner, targetUser, productType]);

  const handleCopyField = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const limits = CHAR_LIMITS[platform];
  const inputClass = "w-full bg-[#161B22] border border-[#21262D] rounded-lg px-4 py-3 text-white placeholder-[#8B949E] focus:outline-none focus:border-[#F5A623] transition-colors text-sm";
  const labelClass = "block text-[#8B949E] text-sm mb-2";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-6">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </a>

        <h1 className="text-2xl font-bold text-white mb-1">📦 Store Listing Generator</h1>
        <p className="text-zinc-400 text-sm mb-8">Generate optimised copy for your product listing — within platform character limits.</p>

        {/* Form */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Platform</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPlatform(p.id); setResult(null); setStatus("idle"); }}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: platform === p.id ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${platform === p.id ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: platform === p.id ? "#F5A623" : "#71717a",
                    }}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Product name</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. LaunchKit Pro" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>One-liner</label>
              <input type="text" value={oneLiner} onChange={e => setOneLiner(e.target.value)} placeholder="What it does in one sentence" className={inputClass} />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass}>Target user</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TARGET_USERS.map(u => (
                    <button key={u} type="button" onClick={() => setTargetUser(u)} className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                      style={{ background: targetUser === u ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${targetUser === u ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`, color: targetUser === u ? "#F5A623" : "#71717a" }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Product type</label>
                <div className="flex gap-1.5 flex-wrap">
                  {PRODUCT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setProductType(t)} className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                      style={{ background: productType === t ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${productType === t ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`, color: productType === t ? "#F5A623" : "#71717a" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!productName || !oneLiner || status === "streaming"}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#F5A623", color: "#000" }}
            >
              {status === "streaming" ? "Generating…" : "Generate Listing Copy"}
            </button>
          </div>
        </div>

        {/* Results */}
        {status === "streaming" && !result && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Generating listing copy…
            <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400 text-center py-4">Failed to generate — try again.</p>
        )}

        {status === "done" && result && (
          <div className="flex flex-col gap-3">
            {Object.entries(result).map(([key, value]) => {
              const limit = limits[key];
              const len = value.length;
              const overLimit = limit !== undefined && len > limit;
              return (
                <div
                  key={key}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${overLimit ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                      {FIELD_LABELS[key] ?? key}
                    </p>
                    <div className="flex items-center gap-2">
                      {limit !== undefined && (
                        <span
                          className="text-xs font-mono"
                          style={{ color: overLimit ? "#f87171" : "#52525b" }}
                        >
                          {len}/{limit}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyField(key, value)}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ background: "rgba(255,255,255,0.06)", color: copied === key ? "#4ade80" : "#a1a1aa" }}
                      >
                        {copied === key ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{value}</p>
                  {overLimit && (
                    <p className="mt-1.5 text-xs text-red-400">⚠ {len - limit} chars over the {limit}-char limit</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
