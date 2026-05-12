import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-[#21262D] bg-[#0D1117] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">
          🥚 Hatchery
        </Link>
        <Link
          href="/onboarding"
          className="bg-[#F5A623] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#E09415] transition-colors"
        >
          Build my plan →
        </Link>
      </div>
    </header>
  );
}
