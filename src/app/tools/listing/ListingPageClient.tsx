"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Platform = "chrome-web-store" | "app-store" | "play-store" | "product-hunt";
type GenStatus = "idle" | "streaming" | "done" | "error";

interface PlatformField {
  key: string;
  label: string;
  maxChars: number;
}

const PLATFORMS: { value: Platform; label: string; emoji: string; fields: PlatformField[] }[] = [
  {
    value: "chrome-web-store",
    label: "Chrome Web Store",
    emoji: "🌐",
    fields: [
      { key: "name",             label: "Name",              maxChars: 45  },
      { key: "shortDescription", label: "Short Description", maxChars: 132 },
      { key: "description",      label: "Description",       maxChars: 1000 },
      { key: "category",         label: "Category",          maxChars: 50  },
    ],
  },
  {
    value: "app-store",
    label: "App Store",
    emoji: "🍎",
    fields: [
      { key: "name",        label: "Name",        maxChars: 30   },
      { key: "subtitle",    label: "Subtitle",    maxChars: 30   },
      { key: "description", label: "Description", maxChars: 4000 },
      { key: "keywords",    label: "Keywords",    maxChars: 100  },
    ],
  },
  {
    value: "play-store",
    label: "Google Play",
    emoji: "▶️",
    fields: [
      { key: "title",            label: "Title",             maxChars: 50   },
      { key: "shortDescription", label: "Short Description", maxChars: 80   },
      { key: "fullDescription",  label: "Full Description",  maxChars: 4000 },
    ],
  },
  {
    value: "product-hunt",
    label: "Product Hunt",
    emoji: "🐱",
    fields: [
      { key: "tagline",      label: "Tagline",       maxChars: 60  },
      { key: "description",  label: "Description",   maxChars: 500 },
      { key: "firstComment", label: "First Comment", maxChars: 800 },
    ],
  },
];

const PRODUCT_TYPES = ["Chrome Extension", "Web App", "Mobile App", "CLI / Dev Tool", "Other"];
const TARGET_USERS  = ["Developers", "Indie Founders", "Small Businesses", "Consumers", "Other"];

export default function ListingPageClient() {
  const searchParams = useSearchParams();

  const [productName, setProductName] = useState(searchParams.get("productName") ?? "");
  const [oneLiner,    setOneLiner]    = useState(searchParams.get("oneLiner")    ?? "");
  const [targetUser,  setTargetUser]  = useState(searchParams.get("targetUser")  ?? "");
  const [productType, setProductType] = useState(searchParams.get("productType") ?? "");
  const [platform,    setPlatform]    = useState<Platform>("chrome-web-store");
  const [genStatus,   setGenStatus]   = useState<GenStatus>("idle");
  const [result,      setResult]      = useState<Record<string, string>>({});
  const [copied,      setCopied]      = useState<Record<string, boolean>>({});

  const canGenerate = productName.trim().length > 0;
  const activePlatform = PLATFORMS.find((p) => p.value === platform)!;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenStatus("streaming");
    setResult({});
    setCopied({});

    try {
      const resp = await fetch("/api/listing-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, productName, oneLiner, targetUser, productType }),
      });
      if (!resp.ok || !resp.body) { setGenStatus("error"); return; }

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
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const data = dataLine.slice(6);
          if (data === "[DONE]") {
            try {
              const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
              if (!jsonMatch) throw new Error("no JSON");
              const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
              setResult(parsed);
              setGenStatus("done");
            } catch {
              setGenStatus("error");
            }
            return;
          }
          try {
            const chunk = JSON.parse(data) as string;
            accumulated += chunk;
          } catch {
            // skip malformed chunk
          }
        }
      }
      setGenStatus("error");
    } catch {
      setGenStatus("error");
    }
  };

  const handleCopyField = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </a>
          <h1 className="text-2xl font-bold text-white">📦 Store Listing Copy Generator</h1>
          <p className="mt-1 text-zinc-400 text-sm">Generate platform-specific store listing copy with character counts.</p>
        </div>

        {/* Form */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Platform selector */}
          <div className="mb-5">
            <label className="block text-zinc-400 text-sm mb-3">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setPlatform(p.value); setResult({}); setGenStatus("idle"); }}
                  className="flex items-center gap-2 border rounded-lg px-4 py-3 text-sm font-medium transition-colors text-left"
                  style={{
                    background: platform === p.value ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                    borderColor: platform === p.value ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)",
                    color: platform === p.value ? "#F59E0B" : "#71717a",
                  }}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product name */}
          <div className="mb-4">
            <label className="block text-zinc-400 text-sm mb-2">Product name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. LaunchKit Pro"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* One-liner */}
          <div className="mb-4">
            <label className="block text-zinc-400 text-sm mb-2">One-liner <span className="text-zinc-600">(optional)</span></label>
            <input
              type="text"
              value={oneLiner}
              onChange={(e) => setOneLiner(e.target.value)}
              placeholder="e.g. Find the best credit card for every purchase"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Product type pills */}
          <div className="mb-4">
            <label className="block text-zinc-400 text-sm mb-2">Product type <span className="text-zinc-600">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProductType(productType === t ? "" : t)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    background: productType === t ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                    borderColor: productType === t ? "#F59E0B" : "rgba(255,255,255,0.1)",
                    color: productType === t ? "#F59E0B" : "#71717a",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Target user pills */}
          <div className="mb-5">
            <label className="block text-zinc-400 text-sm mb-2">Target user <span className="text-zinc-600">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {TARGET_USERS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setTargetUser(targetUser === u ? "" : u)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    background: targetUser === u ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                    borderColor: targetUser === u ? "#F59E0B" : "rgba(255,255,255,0.1)",
                    color: targetUser === u ? "#F59E0B" : "#71717a",
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || genStatus === "streaming"}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canGenerate && genStatus !== "streaming" ? "#F59E0B" : "rgba(245,158,11,0.3)",
              color: "#000",
            }}
          >
            {genStatus === "streaming" ? "Generating…" : `Generate ${activePlatform.label} copy`}
          </button>
        </div>

        {/* Streaming indicator */}
        {genStatus === "streaming" && (
          <div className="text-center py-4 text-zinc-500 text-sm">
            Generating copy…
            <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
          </div>
        )}

        {/* Error */}
        {genStatus === "error" && (
          <p className="text-red-400 text-sm text-center py-3">Failed to generate — try again.</p>
        )}

        {/* Results */}
        {genStatus === "done" && Object.keys(result).length > 0 && (
          <div className="flex flex-col gap-3">
            {activePlatform.fields.map((field) => {
              const text = result[field.key] ?? "";
              const len = text.length;
              const overLimit = len > field.maxChars;
              return (
                <div
                  key={field.key}
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${overLimit ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{field.label}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono"
                        style={{ color: overLimit ? "#f87171" : "#52525b" }}
                      >
                        {len}/{field.maxChars}
                        {overLimit && " ⚠"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyField(field.key, text)}
                        className="text-xs px-2.5 py-1 rounded-md font-semibold transition-colors"
                        style={{
                          background: copied[field.key] ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${copied[field.key] ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: copied[field.key] ? "#4ade80" : "#a1a1aa",
                        }}
                      >
                        {copied[field.key] ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
