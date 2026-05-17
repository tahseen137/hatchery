"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type DocType = "privacy-policy" | "terms-of-service" | "cookie-policy";
type GenStatus = "idle" | "streaming" | "done" | "error";

const DOC_TYPES: { value: DocType; label: string; desc: string }[] = [
  { value: "privacy-policy",   label: "Privacy Policy",   desc: "How you collect, use, and protect user data" },
  { value: "terms-of-service", label: "Terms of Service", desc: "Rules and agreements for using your product" },
  { value: "cookie-policy",    label: "Cookie Policy",    desc: "How your site uses cookies and tracking" },
];

const TARGET_USERS = ["Developers", "Indie Founders", "Small Businesses", "Consumers", "Other"];

const DISCLAIMER = "\n\n---\n\nThis document was AI-generated for informational purposes. Review with a qualified attorney before use.";

export default function DocsPageClient() {
  const searchParams = useSearchParams();

  const [productName, setProductName] = useState(searchParams.get("productName") ?? "");
  const [oneLiner, setOneLiner] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [docType, setDocType] = useState<DocType>("privacy-policy");
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [docText, setDocText] = useState("");
  const [copied, setCopied] = useState(false);

  const canGenerate = productName.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenStatus("streaming");
    setDocText("");

    try {
      const resp = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, productName, oneLiner, websiteUrl, targetUser }),
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
            const final = accumulated + DISCLAIMER;
            setDocText(final);
            setGenStatus("done");
            return;
          }
          try {
            const chunk = JSON.parse(data) as string;
            accumulated += chunk;
            setDocText(accumulated);
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(docText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([docText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${productName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-bold text-white">📄 Legal Document Generator</h1>
          <p className="mt-1 text-zinc-400 text-sm">Generate plain-language legal docs for your product in seconds.</p>
        </div>

        {/* Form */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Doc type selector */}
          <div className="mb-5">
            <label className="block text-zinc-400 text-sm mb-3">Document type</label>
            <div className="flex flex-col gap-2">
              {DOC_TYPES.map((dt) => (
                <label
                  key={dt.value}
                  className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                    docType === dt.value
                      ? "border-amber-500 bg-amber-500/10 text-white"
                      : "border-zinc-800 text-zinc-400 hover:border-amber-500/40 hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="docType"
                    value={dt.value}
                    checked={docType === dt.value}
                    onChange={() => setDocType(dt.value)}
                    className="sr-only"
                  />
                  <span
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors"
                    style={{
                      borderColor: docType === dt.value ? "#F59E0B" : "#52525b",
                      backgroundColor: docType === dt.value ? "#F59E0B" : "transparent",
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{dt.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{dt.desc}</p>
                  </div>
                </label>
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

          {/* Website URL */}
          <div className="mb-4">
            <label className="block text-zinc-400 text-sm mb-2">Website URL <span className="text-zinc-600">(optional)</span></label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Target user */}
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
            {genStatus === "streaming" ? "Generating…" : "Generate document"}
          </button>
        </div>

        {/* Output */}
        {(genStatus === "streaming" || genStatus === "done" || genStatus === "error") && (
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                {DOC_TYPES.find((d) => d.value === docType)?.label}
                {genStatus === "streaming" && (
                  <span className="inline-block w-2 h-3 ml-1.5 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                )}
              </p>
              {genStatus === "done" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
                    style={{
                      background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: copied ? "#4ade80" : "#a1a1aa",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#F59E0B",
                    }}
                  >
                    Download .txt
                  </button>
                </div>
              )}
            </div>

            {genStatus === "error" && (
              <p className="text-red-400 text-sm">Failed to generate document — try again.</p>
            )}

            {docText && (
              <pre
                className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words font-mono overflow-auto"
                style={{ maxHeight: "600px" }}
              >
                {docText}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
