"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type DocType = "privacy-policy" | "terms-of-service" | "cookie-policy";
type GenStatus = "idle" | "streaming" | "done" | "error";

const DOC_LABELS: Record<DocType, string> = {
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "cookie-policy": "Cookie Policy",
};

const TARGET_USERS = ["Developers", "Indie Founders", "Small Businesses", "Consumers", "Other"];

export default function DocsClient() {
  const searchParams = useSearchParams();

  const [productName, setProductName] = useState(searchParams.get("productName") ?? "");
  const [oneLiner, setOneLiner] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [docType, setDocType] = useState<DocType>("privacy-policy");
  const [status, setStatus] = useState<GenStatus>("idle");
  const [docText, setDocText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setStatus("streaming");
    setDocText("");
    try {
      const resp = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, productName, oneLiner, websiteUrl, targetUser }),
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
            setStatus("done");
            return;
          }
          try {
            const chunk = JSON.parse(data) as string;
            accumulated += chunk;
            setDocText(accumulated);
          } catch { /* skip */ }
        }
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [docType, productName, oneLiner, websiteUrl, targetUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(docText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([docText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName.replace(/\s+/g, "-").toLowerCase() || "product"}-${docType}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

        <h1 className="text-2xl font-bold text-white mb-1">📄 Legal Doc Generator</h1>
        <p className="text-zinc-400 text-sm mb-8">Generate plain-language legal documents for your product. Review with a lawyer before publishing.</p>

        {/* Form */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Document type</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(DOC_LABELS) as DocType[]).map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setDocType(dt)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: docType === dt ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${docType === dt ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: docType === dt ? "#F5A623" : "#71717a",
                    }}
                  >
                    {DOC_LABELS[dt]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Product name</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. LaunchKit Pro" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>One-liner <span className="text-zinc-600">(optional)</span></label>
              <input type="text" value={oneLiner} onChange={e => setOneLiner(e.target.value)} placeholder="What your product does in one sentence" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Website URL <span className="text-zinc-600">(optional)</span></label>
              <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourproduct.com" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Target user</label>
              <div className="flex gap-2 flex-wrap">
                {TARGET_USERS.map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setTargetUser(u)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: targetUser === u ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${targetUser === u ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: targetUser === u ? "#F5A623" : "#71717a",
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!productName || status === "streaming"}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#F5A623", color: "#000" }}
            >
              {status === "streaming" ? "Generating…" : `Generate ${DOC_LABELS[docType]}`}
            </button>
          </div>
        </div>

        {/* Output */}
        {(status === "streaming" || status === "done" || status === "error") && (
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                {DOC_LABELS[docType]}
                {status === "streaming" && (
                  <span className="inline-block w-2 h-3 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                )}
              </p>
              {status === "done" && docText && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: copied ? "#4ade80" : "#a1a1aa" }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F5A623" }}
                  >
                    Download .txt
                  </button>
                </div>
              )}
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">Failed to generate document — try again.</p>
            )}

            {docText && (
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono break-words max-h-[600px] overflow-y-auto">
                {docText}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
