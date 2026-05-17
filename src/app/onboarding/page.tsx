"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Goal = "traction" | "funding";

type FormData = {
  productName: string;
  oneLiner: string;
  url: string;
  productType: string;
  targetUser: string;
  hangoutPlatforms: string[];
  launchStatus: string;
  currentUsers: string;
  willUsePlatforms: string[];
};

const TOTAL_STEPS = 5;

const PRODUCT_TYPES = [
  "Chrome Extension",
  "Web App",
  "Mobile App",
  "CLI / Dev Tool",
  "Other",
];

const TARGET_USERS = [
  "Developers",
  "Indie Founders",
  "Small Businesses",
  "Consumers",
  "Other",
];

const HANGOUT_PLATFORMS = [
  "Reddit",
  "Twitter/X",
  "Product Hunt",
  "Hacker News",
  "LinkedIn",
  "Discord",
  "Newsletters",
];

const LAUNCH_STATUSES = [
  "Not launched yet",
  "Just launched (< 1 week)",
  "Launched a while ago (seeking growth)",
];

const USER_COUNTS = ["0", "1–10", "11–100", "100+"];

const DISTRIBUTION_PLATFORMS = [
  "Reddit",
  "Product Hunt",
  "BetaList",
  "Chrome Web Store",
  "Twitter/X",
  "Newsletter placements",
  "Hacker News (Show HN)",
  "Personal blog/SEO",
];

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
            value === opt
              ? "border-[#F5A623] bg-[#F5A623]/10 text-white"
              : "border-[#21262D] text-[#8B949E] hover:border-[#F5A623]/40 hover:text-white"
          }`}
        >
          <input
            type="radio"
            name={opt}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          <span
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
              value === opt ? "border-[#F5A623] bg-[#F5A623]" : "border-[#8B949E]"
            }`}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(
      values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]
    );
  };
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <label
            key={opt}
            className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
              checked
                ? "border-[#F5A623] bg-[#F5A623]/10 text-white"
                : "border-[#21262D] text-[#8B949E] hover:border-[#F5A623]/40 hover:text-white"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt)}
              className="sr-only"
            />
            <span
              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                checked ? "border-[#F5A623] bg-[#F5A623]" : "border-[#8B949E]"
              }`}
            >
              {checked && (
                <svg
                  className="w-2.5 h-2.5 text-black"
                  viewBox="0 0 10 10"
                  fill="none"
                >
                  <path
                    d="M1.5 5L4 7.5L8.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {opt}
          </label>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-[#21262D] last:border-0">
      <span className="text-[#8B949E] text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">{value}</span>
    </div>
  );
}

type AutoFillStatus = "idle" | "loading" | "success" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<Goal>("traction");
  const [autoFillStatus, setAutoFillStatus] = useState<AutoFillStatus>("idle");
  const [formData, setFormData] = useState<FormData>({
    productName: "",
    oneLiner: "",
    url: "",
    productType: "",
    targetUser: "",
    hangoutPlatforms: [],
    launchStatus: "",
    currentUsers: "",
    willUsePlatforms: [],
  });

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleAutoFill = async () => {
    if (!formData.url) return;
    setAutoFillStatus("loading");
    try {
      const resp = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formData.url, productName: formData.productName }),
      });
      const data = await resp.json() as {
        oneLiner?: string;
        productType?: string;
        targetUser?: string;
        error?: string;
      };
      if (data.error || !data.oneLiner) {
        setAutoFillStatus("error");
        setTimeout(() => setAutoFillStatus("idle"), 3000);
        return;
      }
      setFormData((prev) => ({
        ...prev,
        oneLiner: data.oneLiner ? data.oneLiner.slice(0, 100) : prev.oneLiner,
        productType: data.productType && PRODUCT_TYPES.includes(data.productType) ? data.productType : prev.productType,
        targetUser: data.targetUser && TARGET_USERS.includes(data.targetUser) ? data.targetUser : prev.targetUser,
      }));
      setAutoFillStatus("success");
      setTimeout(() => setAutoFillStatus("idle"), 3000);
    } catch {
      setAutoFillStatus("error");
      setTimeout(() => setAutoFillStatus("idle"), 3000);
    }
  };

  const generate = () => {
    const params = new URLSearchParams({
      productName: formData.productName,
      oneLiner: formData.oneLiner,
      url: formData.url,
      productType: formData.productType,
      targetUser: formData.targetUser,
      hangoutPlatforms: formData.hangoutPlatforms.join(","),
      launchStatus: formData.launchStatus,
      currentUsers: formData.currentUsers,
      platforms: formData.willUsePlatforms.join(","),
      goal,
    });
    router.push(`/plan?${params.toString()}`);
  };

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12">
      {/* Progress bar */}
      <div className="w-full h-1 bg-[#21262D] rounded-full mb-10 overflow-hidden">
        <div
          className="h-full bg-[#F5A623] rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-[#8B949E] text-sm mb-2">
        Step {step} of {TOTAL_STEPS}
      </p>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-8">
            What are you building?
          </h1>
          <div className="flex flex-col gap-5">
            {/* Goal selector */}
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                What&apos;s your primary goal?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGoal("traction")}
                  className="flex-1 flex flex-col items-center gap-1 border rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                  style={{
                    background: goal === "traction" ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.03)",
                    borderColor: goal === "traction" ? "#F5A623" : "rgba(255,255,255,0.08)",
                    color: goal === "traction" ? "#F5A623" : "#8B949E",
                  }}
                >
                  <span className="text-xl">🚀</span>
                  <span>Get users &amp; traction</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("funding")}
                  className="flex-1 flex flex-col items-center gap-1 border rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                  style={{
                    background: goal === "funding" ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                    borderColor: goal === "funding" ? "#8B5CF6" : "rgba(255,255,255,0.08)",
                    color: goal === "funding" ? "#a78bfa" : "#8B949E",
                  }}
                >
                  <span className="text-xl">💰</span>
                  <span>Raise funding</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-2">
                Product name
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => update("productName", e.target.value)}
                placeholder="e.g. LaunchKit Pro"
                className="w-full bg-[#161B22] border border-[#21262D] rounded-lg px-4 py-3 text-white placeholder-[#8B949E] focus:outline-none focus:border-[#F5A623] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-2">
                One-liner{" "}
                <span className="text-[#8B949E]/60">(max 100 chars)</span>
              </label>
              <input
                type="text"
                value={formData.oneLiner}
                onChange={(e) =>
                  update("oneLiner", e.target.value.slice(0, 100))
                }
                placeholder="e.g. Find the best credit card for every purchase"
                className="w-full bg-[#161B22] border border-[#21262D] rounded-lg px-4 py-3 text-white placeholder-[#8B949E] focus:outline-none focus:border-[#F5A623] transition-colors"
              />
              <p className="text-[#8B949E]/60 text-xs mt-1 text-right">
                {formData.oneLiner.length}/100
              </p>
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-2">
                URL{" "}
                <span className="text-[#8B949E]/60">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://"
                className="w-full bg-[#161B22] border border-[#21262D] rounded-lg px-4 py-3 text-white placeholder-[#8B949E] focus:outline-none focus:border-[#F5A623] transition-colors"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!formData.url || autoFillStatus === "loading"}
                  className="text-xs px-3 py-1.5 rounded-md font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(245,166,35,0.15)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    color: "#F5A623",
                  }}
                >
                  {autoFillStatus === "loading" ? "Analyzing…" : "✨ Auto-fill"}
                </button>
                {autoFillStatus === "success" && (
                  <span className="text-xs text-green-400">✅ Fields filled from your site</span>
                )}
                {autoFillStatus === "error" && (
                  <span className="text-xs text-amber-400">⚠ Couldn&apos;t read the site — fill manually</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                Product type
              </label>
              <RadioGroup
                options={PRODUCT_TYPES}
                value={formData.productType}
                onChange={(v) => update("productType", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-8">
            Who&apos;s it for?
          </h1>
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                Target user
              </label>
              <RadioGroup
                options={TARGET_USERS}
                value={formData.targetUser}
                onChange={(v) => update("targetUser", v)}
              />
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                Where do they hang out?
              </label>
              <CheckboxGroup
                options={HANGOUT_PLATFORMS}
                values={formData.hangoutPlatforms}
                onChange={(v) => update("hangoutPlatforms", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-8">
            What&apos;s your launch situation?
          </h1>
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                Launch status
              </label>
              <RadioGroup
                options={LAUNCH_STATUSES}
                value={formData.launchStatus}
                onChange={(v) => update("launchStatus", v)}
              />
            </div>
            <div>
              <label className="block text-[#8B949E] text-sm mb-3">
                Current users
              </label>
              <RadioGroup
                options={USER_COUNTS}
                value={formData.currentUsers}
                onChange={(v) => update("currentUsers", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Where are you willing to show up?
          </h1>
          <p className="text-[#8B949E] text-sm mb-6">
            We&apos;ll only include platforms in your plan that you select.
          </p>
          <CheckboxGroup
            options={DISTRIBUTION_PLATFORMS}
            values={formData.willUsePlatforms}
            onChange={(v) => update("willUsePlatforms", v)}
          />
        </div>
      )}

      {/* Step 5 */}
      {step === 5 && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Ready to generate your plan?
          </h1>
          <p className="text-[#8B949E] text-sm mb-8">
            Here&apos;s a summary of what you told us.
          </p>
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-6 py-2 mb-8">
            <SummaryRow label="Goal" value={goal === "funding" ? "💰 Raise funding" : "🚀 Get users & traction"} />
            <SummaryRow label="Product" value={formData.productName || "—"} />
            <SummaryRow label="One-liner" value={formData.oneLiner || "—"} />
            {formData.url && <SummaryRow label="URL" value={formData.url} />}
            <SummaryRow label="Type" value={formData.productType || "—"} />
            <SummaryRow label="Target user" value={formData.targetUser || "—"} />
            <SummaryRow
              label="Audience hangs out on"
              value={formData.hangoutPlatforms.join(", ") || "—"}
            />
            <SummaryRow
              label="Launch status"
              value={formData.launchStatus || "—"}
            />
            <SummaryRow
              label="Current users"
              value={formData.currentUsers || "—"}
            />
            <SummaryRow
              label="Platforms to use"
              value={formData.willUsePlatforms.join(", ") || "—"}
            />
          </div>
          <button
            onClick={generate}
            className="w-full bg-[#F5A623] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#E09415] transition-colors shadow-lg shadow-[#F5A623]/20"
          >
            Generate my 30-day plan →
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        {step > 1 ? (
          <button
            onClick={back}
            className="text-[#8B949E] hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}
        {step < TOTAL_STEPS && (
          <button
            onClick={next}
            className="bg-[#F5A623] text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-[#E09415] transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    </main>
  );
}
