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
      "Every playbook has been tested in the real world by indie founders who've shipped. No theory.",
    icon: "🧪",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
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
          Platform-specific playbooks for indie founders. Know exactly where to
          go and what to do — on Reddit, Product Hunt, Chrome Web Store, and
          beyond.
        </p>

        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 bg-[#F5A623] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#E09415] transition-colors shadow-lg shadow-[#F5A623]/20"
        >
          Build my launch plan →
        </Link>

        <p className="mt-6 text-[#8B949E] text-sm">✓ Free to use · No signup required · Your plan in 2 minutes</p>
      </section>

      {/* Divider */}
      <div className="border-t border-[#21262D]" />

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-center text-[#8B949E] text-sm font-semibold uppercase tracking-widest mb-12">
          What you get
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 hover:border-[#F5A623]/40 transition-colors"
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
          Built by an indie founder, for indie founders. · hatchery.dev
        </p>
      </footer>
    </main>
  );
}
