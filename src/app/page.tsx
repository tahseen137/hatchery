import Link from "next/link";

const features = [
  {
    title: "Platform Playbooks",
    description:
      "Encoded know-how for Reddit, Product Hunt, BetaList, Chrome Web Store, Twitter, and newsletters. The unwritten rules, written.",
    icon: "📋",
  },
  {
    title: "Day-by-day Plan",
    description:
      "A 30-day calendar of exactly what to do and when. No guessing, no generic advice.",
    icon: "📅",
  },
  {
    title: "Live Test Case",
    description:
      "Built alongside the Rewardly Chrome Extension. Every playbook is battle-tested.",
    icon: "🧪",
  },
];

export default function Home() {
  return (
    <main className="flex-1 min-h-screen pb-24">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 text-[#8B949E] text-sm border border-[#21262D] rounded-full px-4 py-1.5 mb-8">
          <span>🔥</span>
          <span>A new way to launch your product</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          🔥{" "}
          <span className="text-white">Hatchery</span>
        </h1>

        <p className="text-2xl sm:text-3xl font-semibold text-white mb-4">
          A hatchery for product launches.
        </p>

        <p className="text-[#8B949E] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          You&apos;ve built the thing. Now what? Hatchery gives you a
          platform-specific 30-day plan — exactly where to show up, what to
          say, and when. No fluff, no generic advice. Just the playbook.
        </p>

        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-xl bg-[#F5A623]/30 blur-xl scale-110 pointer-events-none" />
          <Link
            href="/onboarding"
            className="relative inline-flex items-center gap-2 bg-[#F5A623] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#E09415] transition-colors shadow-lg shadow-[#F5A623]/30 hover-glow"
          >
            Build my launch plan →
          </Link>
        </div>

        <p className="mt-6 text-[#8B949E] text-sm">
          ✓ Used to launch{" "}
          <span className="text-white font-medium">Rewardly Extension</span> —
          Canada&apos;s top credit card rewards tool
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-[#21262D]" />

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-center text-[#8B949E] text-sm font-semibold uppercase tracking-widest mb-12">
          What you get
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 hover:border-[#F5A623]/40 hover:bg-[#161B22]/80 transition-all duration-200 hover-glow"
            >
              <span className="text-3xl mb-4 block">{feature.icon}</span>
              <h3 className="text-white font-semibold text-lg mb-3">
                {feature.title}
              </h3>
              <p className="text-[#8B949E] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#21262D] py-8">
        <p className="text-center text-[#8B949E] text-sm">
          Built by an indie founder, for indie founders. · hatchery.dev · © 2026 Hatchery
        </p>
      </footer>
    </main>
  );
}
