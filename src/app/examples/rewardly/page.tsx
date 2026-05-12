import Link from "next/link";

const WEEK_STEPS = [
  { week: 1, label: "Groundwork", done: true },
  { week: 2, label: "First signals", done: true },
  { week: 3, label: "Amplify", done: true },
  { week: 4, label: "Compound", done: false },
];

const HIGHLIGHTS = [
  { day: 1,  platform: "🔴 Reddit",       action: "Lurked r/PersonalFinanceCanada — studied 20 top posts, zero self-promotion." },
  { day: 3,  platform: "🔴 Reddit",       action: "Dropped 2 genuinely helpful comments. No mention of the product." },
  { day: 7,  platform: "⭐ Must Do",       action: "Emailed 40 personal contacts. One sentence, one ask. 12 installed." },
  { day: 12, platform: "🔴 Reddit",       action: "🚀 Posted to r/PersonalFinanceCanada. 200+ upvotes in 3 hours. Top of week." },
  { day: 14, platform: "🐱 Product Hunt", action: "🚀 Launched on Product Hunt. Hit #6 product of the day." },
  { day: 21, platform: "🌐 Chrome Store", action: "Updated description with user-language keywords. Rankings improved." },
  { day: 30, platform: "⭐ Must Do",       action: "Published '30 days of launching Rewardly' thread. 4k impressions." },
];

export default function RewardlyExamplePage() {
  return (
    <main className="flex-1 min-h-screen pb-24">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#8B949E] hover:text-white transition-colors text-sm mb-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Hatchery
        </Link>

        {/* Live badge */}
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
            Live right now
          </span>
          <span className="text-[#8B949E] text-sm">Rewardly Chrome Extension</span>
        </div>

        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
          How we launched Rewardly using Hatchery
        </h1>
        <p className="text-[#8B949E] text-lg leading-relaxed mb-10">
          Rewardly is Canada&apos;s top credit card rewards optimizer — 410+ cards, AI-powered recommendations,
          bilingual support. We built Hatchery <em>while</em> launching it. Every playbook in here is something
          we actually executed.
        </p>

        {/* Testimonial */}
        <blockquote className="border-l-4 border-[#F5A623] bg-[#F5A623]/5 rounded-r-xl px-6 py-5 mb-12">
          <p className="text-white text-lg leading-relaxed italic mb-3">
            &ldquo;We built Hatchery while launching Rewardly. Every playbook in here is something we actually did.
            No theory, no blog-post recycling — just the moves that worked for a real Chrome Extension launch
            targeting real Canadians.&rdquo;
          </p>
          <cite className="text-[#F5A623] text-sm font-semibold not-italic">
            — Tahseen Rahman, founder of Rewardly &amp; Hatchery
          </cite>
        </blockquote>

        {/* Week Progress Stepper */}
        <div className="mb-12">
          <h2 className="text-white font-bold text-lg mb-6">30-day launch progress</h2>
          <div className="relative flex items-start gap-0">
            {WEEK_STEPS.map((step, idx) => (
              <div key={step.week} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {idx < WEEK_STEPS.length - 1 && (
                  <div
                    className="absolute top-4 left-1/2 w-full h-0.5"
                    style={{
                      background: step.done ? "#F5A623" : "rgba(255,255,255,0.1)",
                      transform: "translateX(0)",
                    }}
                  />
                )}
                {/* Circle */}
                <div
                  className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 transition-all"
                  style={{
                    background: step.done ? "#F5A623" : "rgba(255,255,255,0.06)",
                    borderColor: step.done ? "#F5A623" : "rgba(255,255,255,0.15)",
                    color: step.done ? "#000" : "#52525b",
                  }}
                >
                  {step.done ? "✓" : step.week}
                </div>
                <span className="text-xs text-center" style={{ color: step.done ? "#F5A623" : "#52525b" }}>
                  Week {step.week}
                </span>
                <span className="text-xs text-center text-[#8B949E] mt-0.5 hidden sm:block">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Reddit upvotes", value: "200+" },
            { label: "PH ranking", value: "#6" },
            { label: "Day 1 installs", value: "40+" },
            { label: "Chrome rating", value: "4.8 ⭐" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-[#8B949E] text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Day-by-day highlights */}
        <div className="mb-12">
          <h2 className="text-white font-bold text-lg mb-6">Day-by-day highlights</h2>
          <div className="flex flex-col gap-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.day}
                className="flex items-start gap-4 bg-[#161B22] border border-[#21262D] rounded-xl px-5 py-4 hover:border-[#F5A623]/30 transition-colors hover-glow"
              >
                <div className="flex-shrink-0 w-14 text-center">
                  <span className="text-[#F5A623] text-xs font-bold uppercase">Day</span>
                  <p className="text-white font-bold text-lg leading-none">{h.day}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#8B949E] mb-1 block">{h.platform}</span>
                  <p className="text-[#e4e4e7] text-sm leading-snug">{h.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-[#8B949E] text-sm mb-4">Ready to run the same playbook for your product?</p>
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-xl bg-[#F5A623]/25 blur-lg pointer-events-none" />
            <Link
              href="/onboarding"
              className="relative inline-flex items-center gap-2 bg-[#F5A623] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#E09415] transition-colors shadow-lg shadow-[#F5A623]/30 hover-glow"
            >
              Build my launch plan →
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
