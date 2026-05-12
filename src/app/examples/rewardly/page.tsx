import Link from "next/link";

type PlatformId = "chrome" | "reddit" | "twitter" | "producthunt" | "general";
type TaskStatus = "done" | "in-progress" | "upcoming";

interface Task {
  day: number;
  platform: PlatformId;
  description: string;
  status: TaskStatus;
}

const PLATFORM_INFO: Record<PlatformId, { name: string; color: string; emoji: string }> = {
  chrome:      { name: "Chrome Web Store", color: "#4285F4", emoji: "🌐" },
  reddit:      { name: "Reddit",           color: "#FF4500", emoji: "🔴" },
  twitter:     { name: "Twitter/X",        color: "#E7E9EA", emoji: "🐦" },
  producthunt: { name: "Product Hunt",     color: "#DA552F", emoji: "🐱" },
  general:     { name: "General",          color: "#F5A623", emoji: "⭐" },
};

const TASKS: Task[] = [
  // Week 1
  { day: 1, platform: "chrome",      status: "done",        description: "Verify listing is live at chrome.google.com/webstore. Privacy policy URL confirmed at rewardly.ca/privacy-policy.html ✅" },
  { day: 1, platform: "reddit",      status: "done",        description: "Joined r/PersonalFinanceCanada, r/canadianpersonalfinance, r/churning. Reading top posts of all time. No posting yet." },
  { day: 1, platform: "general",     status: "done",        description: 'Wrote the one-liner: "Never use the wrong credit card at checkout again — Rewardly shows your best card, every time."' },
  { day: 2, platform: "chrome",      status: "done",        description: "Asked 5 friends to install and leave an honest review." },
  { day: 2, platform: "twitter",     status: "done",        description: 'Posted "building in public" tweet about the extension without a link.' },
  { day: 3, platform: "reddit",      status: "done",        description: "Made 3 genuine helpful comments in r/PersonalFinanceCanada about credit card strategies. No self-promotion." },
  { day: 3, platform: "twitter",     status: "done",        description: 'Tweeted the problem statement: "Most Canadians with premium cards miss out on 2–4% cashback on every purchase because they forget which card to use."' },
  { day: 5, platform: "reddit",      status: "done",        description: "Made 3 more genuine comments. Replied to people asking about credit card recommendations." },
  { day: 7, platform: "general",     status: "done",        description: 'Emailed personal network. 1 sentence about the extension, 1 ask: "Would you try it and tell me what you think?"' },
  { day: 7, platform: "twitter",     status: "done",        description: "Launch tweet thread — problem → solution → demo → link. Pinned to profile." },
  // Week 2
  { day: 8,  platform: "reddit",      status: "in-progress", description: 'Drafting "Show Reddit" post for r/PersonalFinanceCanada. Planning angle: "I built a Chrome extension that tells you which Canadian credit card to use at every checkout — thoughts?"' },
  { day: 10, platform: "chrome",      status: "in-progress", description: "Writing blog post about the cashback optimization problem. Will submit to r/webdev when done." },
  { day: 12, platform: "reddit",      status: "upcoming",    description: "Post to r/PersonalFinanceCanada. Answer every comment within 2 hours." },
  { day: 14, platform: "producthunt", status: "upcoming",    description: "Reach out to a Product Hunt hunter with 500+ followers in the fintech/productivity space." },
  // Week 3
  { day: 14, platform: "producthunt", status: "upcoming",    description: "Prepare full PH listing — tagline, gallery, first comment." },
  { day: 16, platform: "producthunt", status: "upcoming",    description: "Soft launch on PH (Tuesday). Notify email list." },
  { day: 17, platform: "producthunt", status: "upcoming",    description: "Respond to every PH comment. Stay in the conversation all day." },
  { day: 20, platform: "reddit",      status: "upcoming",    description: "Post to r/churning with a different angle — focused on maximizing category bonuses." },
  { day: 21, platform: "chrome",      status: "upcoming",    description: "Respond to any reviews. Update listing description with keywords from user feedback." },
  { day: 21, platform: "twitter",     status: "upcoming",    description: 'Tweet "what I learned from launching" thread.' },
  // Week 4
  { day: 22, platform: "general",     status: "upcoming",    description: "Find 5 Canadian personal finance newsletters. Submit for free listing." },
  { day: 25, platform: "reddit",      status: "upcoming",    description: "Third post — r/canada or r/ontario with local angle." },
  { day: 28, platform: "general",     status: "upcoming",    description: "Follow up with newsletters that haven't featured the extension." },
  { day: 30, platform: "general",     status: "upcoming",    description: 'Write "30 days of launching Rewardly" post. Publish everywhere.' },
];

const WEEKS = [
  { num: 1, label: "Week 1", days: [1, 7],  status: "complete" as const },
  { num: 2, label: "Week 2", days: [8, 14], status: "in-progress" as const },
  { num: 3, label: "Week 3", days: [15, 21], status: "upcoming" as const },
  { num: 4, label: "Week 4", days: [22, 30], status: "upcoming" as const },
];

function statusIcon(status: TaskStatus) {
  if (status === "done") return "✅";
  if (status === "in-progress") return "🔥";
  return "🔒";
}

function TaskCard({ task }: { task: Task }) {
  const platform = PLATFORM_INFO[task.platform];
  const borderColor =
    task.status === "done"
      ? "#22c55e"
      : task.status === "in-progress"
      ? "#F5A623"
      : "#3f3f46";
  const bg =
    task.status === "done"
      ? "rgba(34,197,94,0.05)"
      : task.status === "in-progress"
      ? "rgba(245,166,35,0.07)"
      : "rgba(255,255,255,0.02)";
  const textColor =
    task.status === "done"
      ? "#71717a"
      : task.status === "in-progress"
      ? "#e4e4e7"
      : "#52525b";

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: bg,
        borderColor: "rgba(255,255,255,0.08)",
        borderLeftWidth: "3px",
        borderLeftColor: borderColor,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-base flex-shrink-0 mt-0.5">{statusIcon(task.status)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: textColor }}>
            {task.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: `${platform.color}20`,
                color: platform.color,
                border: `1px solid ${platform.color}40`,
              }}
            >
              {platform.emoji} {platform.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RewardlyExamplePage() {
  const weeks = [1, 2, 3, 4];

  return (
    <div className="min-h-screen" style={{ background: "#0D1117" }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Hatchery
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fca5a5",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "#ef4444" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#ef4444" }}
              />
            </span>
            🔴 Live right now
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
            Live Launch: Rewardly Extension
          </h1>
          <p className="text-zinc-400 text-base italic mb-6">
            &ldquo;A real launch, happening right now — built with Hatchery&rdquo;
          </p>

          {/* Product metadata */}
          <div
            className="rounded-xl p-5 grid sm:grid-cols-2 gap-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              { label: "Product", value: "Rewardly Chrome Extension" },
              { label: "Type", value: "Chrome Extension" },
              { label: "Audience", value: "Canadians who use credit cards and want to maximize rewards" },
              { label: "Platforms", value: "Chrome Web Store · Reddit · Product Hunt · Twitter/X" },
              { label: "Status", value: "Just launched ✅" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm text-zinc-200 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress summary bar */}
        <div
          className="rounded-xl p-5 mb-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-semibold">
            30-Day Progress
          </p>
          <div className="flex gap-2 flex-wrap">
            {WEEKS.map((w) => {
              const isComplete = w.status === "complete";
              const isInProgress = w.status === "in-progress";
              return (
                <div
                  key={w.num}
                  className="flex-1 min-w-[100px] rounded-lg px-3 py-2.5 text-center"
                  style={{
                    background: isComplete
                      ? "rgba(34,197,94,0.1)"
                      : isInProgress
                      ? "rgba(245,166,35,0.1)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      isComplete
                        ? "rgba(34,197,94,0.3)"
                        : isInProgress
                        ? "rgba(245,166,35,0.3)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                  }}
                >
                  <p
                    className="text-xs font-bold"
                    style={{
                      color: isComplete ? "#4ade80" : isInProgress ? "#F5A623" : "#52525b",
                    }}
                  >
                    {w.label}
                  </p>
                  <p className="text-lg mt-0.5">
                    {isComplete ? "✅" : isInProgress ? "🔥" : "🔒"}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: isComplete ? "#86efac" : isInProgress ? "#fcd34d" : "#3f3f46",
                    }}
                  >
                    {isComplete ? "Complete" : isInProgress ? "In Progress" : "Upcoming"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 30-day plan by week */}
        {weeks.map((w) => {
          const [start, end] = WEEKS[w - 1].days;
          const weekLabel = WEEKS[w - 1].label;
          const weekStatus = WEEKS[w - 1].status;
          const weekTasks = TASKS.filter((t) => t.day >= start && t.day <= end);
          const dayNums = Array.from(new Set(weekTasks.map((t) => t.day))).sort((a, b) => a - b);

          const headerColor =
            weekStatus === "complete"
              ? "#4ade80"
              : weekStatus === "in-progress"
              ? "#F5A623"
              : "#3f3f46";

          return (
            <div key={w} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: headerColor }}
                >
                  {weekLabel} — Days {start}–{end}
                </h2>
                <div
                  className="flex-1 h-px"
                  style={{ background: `${headerColor}30` }}
                />
              </div>

              {dayNums.map((day) => {
                const dayTasks = weekTasks.filter((t) => t.day === day);
                return (
                  <div key={day} className="mb-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "#a1a1aa",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Day {day}
                      </div>
                      <div
                        className="flex-1 h-px"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {dayTasks.map((task, i) => (
                        <TaskCard key={`${task.day}-${task.platform}-${i}`} task={task} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Bottom CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(245,166,35,0.1), rgba(217,119,6,0.05))",
            border: "1px solid rgba(245,166,35,0.25)",
          }}
        >
          <h2 className="text-2xl font-bold text-white mb-3">
            Want a plan like this for your product?
          </h2>
          <p className="text-zinc-400 text-base mb-6 max-w-md mx-auto leading-relaxed">
            &ldquo;Hatchery generated this exact plan in 2 minutes.
            Every playbook is based on what actually works — no generic advice.&rdquo;
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-[#F5A623] text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#E09415] transition-colors shadow-lg shadow-[#F5A623]/20"
          >
            Build my launch plan →
          </Link>
        </div>
      </div>
    </div>
  );
}
