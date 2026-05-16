"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformInsight {
  communities?: string[];
  hook?: string;
}

interface AIInsights {
  platformInsights?: Record<string, PlatformInsight>;
  biggestMistake?: string;
}

type PlatformId =
  | "reddit"
  | "producthunt"
  | "betalist"
  | "chrome"
  | "twitter"
  | "hn"
  | "newsletter"
  | "universal";

type Difficulty = "easy" | "medium" | "hard";

interface Task {
  id: string;
  day: number;
  platform: PlatformId;
  title: string;
  tip?: string;
  xp: number;
  difficulty: Difficulty;
  isLaunchTask?: boolean;
}

interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  unlocked: boolean;
}

interface SavedProgress {
  completedTasks: string[];
  streak: number;
  lastActivityDate: string | null;
  unlockedBadgeIds: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_INFO: Record<
  PlatformId,
  { name: string; color: string; emoji: string }
> = {
  reddit:      { name: "Reddit",       color: "#FF4500", emoji: "🔴" },
  producthunt: { name: "Product Hunt", color: "#DA552F", emoji: "🐱" },
  betalist:    { name: "BetaList",     color: "#00BFA5", emoji: "📋" },
  chrome:      { name: "Chrome Store", color: "#4285F4", emoji: "🌐" },
  twitter:     { name: "Twitter/X",    color: "#E7E9EA", emoji: "🐦" },
  hn:          { name: "Hacker News",  color: "#FF6600", emoji: "🔶" },
  newsletter:  { name: "Newsletter",   color: "#9B59B6", emoji: "📧" },
  universal:   { name: "Must Do",      color: "#F59E0B", emoji: "⭐" },
};

const LEVELS = [
  { name: "Hatchling",     min: 0,   max: 199,      emoji: "🥚" },
  { name: "Fledgling",     min: 200, max: 499,      emoji: "🐣" },
  { name: "Launcher",      min: 500, max: 899,       emoji: "🚀" },
  { name: "Growth Hacker", min: 900, max: Infinity,  emoji: "⚡" },
];

const WEEK_RANGES: [number, number][] = [
  [1, 7],
  [8, 14],
  [15, 21],
  [22, 30],
];

const WEEK_MILESTONE_MESSAGES = [
  "🌱 Week 1 complete! You've laid the groundwork. Most founders quit here. You didn't.",
  "🚀 Halfway there! You've built real momentum now.",
  "💪 Week 3 down. The compounding starts now.",
];

const CONFETTI_PIECES = [
  { color: "#F59E0B", tx: "60px",   ty: "-90px",  delay: "0ms"   },
  { color: "#EF4444", tx: "-65px",  ty: "-80px",  delay: "30ms"  },
  { color: "#10B981", tx: "85px",   ty: "-20px",  delay: "60ms"  },
  { color: "#3B82F6", tx: "-90px",  ty: "-10px",  delay: "90ms"  },
  { color: "#8B5CF6", tx: "40px",   ty: "-110px", delay: "20ms"  },
  { color: "#EC4899", tx: "-40px",  ty: "-105px", delay: "50ms"  },
  { color: "#F97316", tx: "100px",  ty: "-55px",  delay: "80ms"  },
  { color: "#84CC16", tx: "-100px", ty: "-60px",  delay: "10ms"  },
  { color: "#14B8A6", tx: "20px",   ty: "-115px", delay: "70ms"  },
  { color: "#06B6D4", tx: "-25px",  ty: "-118px", delay: "40ms"  },
  { color: "#6366F1", tx: "95px",   ty: "25px",   delay: "15ms"  },
  { color: "#E11D48", tx: "-95px",  ty: "20px",   delay: "55ms"  },
];

const STORAGE_KEY = "hatchery-progress-v1";

// ─── Plan Generation ──────────────────────────────────────────────────────────

function generatePlan(platforms: string[]): Task[] {
  const tasks: Task[] = [];

  // Universal tasks — always included
  tasks.push(
    {
      id: "u-1", day: 1, platform: "universal",
      title: "Write your one-liner — say it out loud. If it trips you up, rewrite it. Repeat until it snaps.",
      tip: "Best one-liners describe the transformation: 'X so you can Y' is your template.",
      xp: 25, difficulty: "medium",
    },
    {
      id: "u-2", day: 2, platform: "universal",
      title: "Set up analytics — Plausible is beautiful and privacy-first, Google Analytics works too. Just pick one.",
      tip: "You can't improve what you can't measure. Future you will thank present you.",
      xp: 10, difficulty: "easy",
    },
    {
      id: "u-7", day: 7, platform: "universal",
      title: "Email everyone you know personally. One sentence about what you built, one specific ask. Hit send.",
      tip: "People genuinely want to help. Give them one clear action and they will do it.",
      xp: 50, difficulty: "hard",
    },
    {
      id: "u-30", day: 30, platform: "universal",
      title: "Write your '30 days of launching' post. This is your story — share it everywhere. You earned it.",
      tip: "Authentic founder stories get 10x the engagement of polished marketing. Be honest.",
      xp: 50, difficulty: "hard",
    },
  );

  if (platforms.includes("reddit")) {
    tasks.push(
      {
        id: "r-1", day: 1, platform: "reddit",
        title: "Dive into 3 relevant subreddits. Subscribe. Absorb the all-time top posts. Don't post a single word yet.",
        tip: "Understanding the culture before posting is what separates builders from spammers.",
        xp: 10, difficulty: "easy",
      },
      {
        id: "r-3", day: 3, platform: "reddit",
        title: "Drop 2 genuinely helpful comments in your target subreddits. No self-promotion whatsoever. Just be useful.",
        tip: "Reply to posts with 0–5 comments. You'll stand out more and build real karma fast.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "r-5", day: 5, platform: "reddit",
        title: "Two more genuine comments. Reply to people who responded to you. Build actual relationships.",
        tip: "Consistency beats one big post every time on Reddit. Trust the process.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "r-10", day: 10, platform: "reddit",
        title: "Draft your 'Show Reddit' post. Title, body, screenshots — everything. Don't hit submit. Not yet.",
        tip: "The best Show posts lead with the problem, not the solution. Hook them with the pain.",
        xp: 50, difficulty: "hard",
      },
      {
        id: "r-12", day: 12, platform: "reddit",
        title: "🚀 Post your product to the most relevant subreddit. Answer EVERY comment within 2 hours. Be there.",
        tip: "Engagement in the first hour determines how much Reddit boosts your post.",
        xp: 50, difficulty: "hard", isLaunchTask: true,
      },
      {
        id: "r-20", day: 20, platform: "reddit",
        title: "Post to a second subreddit with a completely different angle. Same product, new story.",
        tip: "Different subreddits care about different things. Reframe — don't copy-paste.",
        xp: 50, difficulty: "hard",
      },
    );
  }

  if (platforms.includes("producthunt")) {
    tasks.push(
      {
        id: "ph-2", day: 2, platform: "producthunt",
        title: "Find a hunter with 500+ followers who launches products in your category. Send them a genuine DM.",
        tip: "Check who hunted similar products successfully. That's your shortlist right there.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "ph-7", day: 7, platform: "producthunt",
        title: "Build your full PH listing: tagline, description, first comment, gallery images. Make it sing.",
        tip: "Your first comment sets the tone — tell your founding story there, not in the description.",
        xp: 50, difficulty: "hard",
      },
      {
        id: "ph-14", day: 14, platform: "producthunt",
        title: "🚀 Soft launch on Product Hunt. Aim Tuesday–Thursday. Notify your existing users — every upvote counts.",
        tip: "Set an alarm for 12:01am PST. Launch day is a full sprint.",
        xp: 50, difficulty: "hard", isLaunchTask: true,
      },
      {
        id: "ph-15", day: 15, platform: "producthunt",
        title: "Reply to every PH comment. Upvote products you genuinely like. Be a real community member.",
        tip: "PH rewards engagement. The more you give to the community, the more you receive.",
        xp: 25, difficulty: "medium",
      },
    );
  }

  if (platforms.includes("betalist")) {
    tasks.push(
      {
        id: "bl-1", day: 1, platform: "betalist",
        title: "Submit to BetaList right now. Features take 1–3 weeks — the earlier you submit, the better.",
        tip: "Write a compelling description. BetaList editors read hundreds — make yours memorable.",
        xp: 10, difficulty: "easy",
      },
      {
        id: "bl-21", day: 21, platform: "betalist",
        title: "Your BetaList feature is live! Engage with every comment and every new sign-up.",
        tip: "BetaList users are elite early adopters. Treat them like gold — they're your first fans.",
        xp: 25, difficulty: "medium",
      },
    );
  }

  if (platforms.includes("chrome")) {
    tasks.push(
      {
        id: "cws-1", day: 1, platform: "chrome",
        title: "Verify your Chrome Store listing is live and your privacy policy URL actually works.",
        tip: "Broken links on day 1 = instant credibility damage. Takes 30 seconds to check.",
        xp: 10, difficulty: "easy",
      },
      {
        id: "cws-3", day: 3, platform: "chrome",
        title: "Ask 5 people you know personally to install your extension and leave an honest review.",
        tip: "Reach out personally, not via mass email. Personal asks have 10x higher conversion.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "cws-10", day: 10, platform: "chrome",
        title: "Write a blog post about the problem your extension solves. Submit it to r/webdev.",
        tip: "Focus the post on the pain, not your solution. Pull readers in with the problem first.",
        xp: 50, difficulty: "hard",
      },
      {
        id: "cws-21", day: 21, platform: "chrome",
        title: "Respond to any Chrome Store reviews. Update your description with keywords from user reviews.",
        tip: "Chrome Store SEO is real. User-language keywords in your description improve rankings.",
        xp: 25, difficulty: "medium",
      },
    );
  }

  if (platforms.includes("twitter")) {
    tasks.push(
      {
        id: "tw-1", day: 1, platform: "twitter",
        title: "Write your 'building in public' intro tweet. What you're launching, why you built it. No links yet.",
        tip: "The best #buildinpublic tweets show your face and your story, not product features.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "tw-3", day: 3, platform: "twitter",
        title: "Tweet the problem you're solving. Describe the pain without pitching your solution. Make people nod.",
        tip: "Problem tweets get shared. Solution tweets get ignored. Lead with the pain.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "tw-7", day: 7, platform: "twitter",
        title: "Drop your launch thread: problem → solution → demo GIF → link. Pin it to your profile right after.",
        tip: "One GIF showing your product in action is worth more than a thousand feature bullets.",
        xp: 50, difficulty: "hard", isLaunchTask: true,
      },
      {
        id: "tw-14", day: 14, platform: "twitter",
        title: "Tweet about your launch. Ask your followers for support — be direct. They want to help you.",
        tip: "People who follow you want you to win. Give them one specific action.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "tw-21", day: 21, platform: "twitter",
        title: "Drop a 'what I learned from launching' thread. Vulnerability + insight = the tweet that travels.",
        tip: "Honest failures resonate 10x more than polished wins. Show the real journey.",
        xp: 50, difficulty: "hard",
      },
    );
  }

  if (platforms.includes("hn")) {
    tasks.push(
      {
        id: "hn-5", day: 5, platform: "hn",
        title: "Write your Show HN post. Format: 'Show HN: [Product] – [one-liner]'. Keep it humble. HN loves that.",
        tip: "HN loves brevity and honesty. If your description is over 10 words, cut it.",
        xp: 50, difficulty: "hard",
      },
      {
        id: "hn-6", day: 6, platform: "hn",
        title: "🚀 Post Show HN at 9am EST on a weekday. Camp the thread for 2 hours. Answer everything.",
        tip: "The HN front page is decided in the first 2 hours. Be completely present.",
        xp: 50, difficulty: "hard", isLaunchTask: true,
      },
    );
  }

  if (platforms.includes("newsletter")) {
    tasks.push(
      {
        id: "nl-2", day: 2, platform: "newsletter",
        title: "Find 5 newsletters in your niche. Check if they accept product submissions or sponsorships.",
        tip: "Search '[your niche] newsletter' + 'submit product'. You'll find more than you expect.",
        xp: 10, difficulty: "easy",
      },
      {
        id: "nl-8", day: 8, platform: "newsletter",
        title: "Submit to 3 newsletters that accept free listings. Write a tailored 2-sentence pitch for each.",
        tip: "Personalize each pitch with something specific about their newsletter. Editors spot templates.",
        xp: 25, difficulty: "medium",
      },
      {
        id: "nl-22", day: 22, platform: "newsletter",
        title: "Follow up with newsletters that haven't featured you. One polite, brief email. It works.",
        tip: "A second email gets 50% open rate when the first was relevant. The follow-up is the move.",
        xp: 10, difficulty: "easy",
      },
    );
  }

  return tasks.sort((a, b) => a.day - b.day || a.platform.localeCompare(b.platform));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevel(xp: number) {
  return LEVELS.find((l) => xp >= l.min && xp <= l.max) ?? LEVELS[0];
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayString() {
  return new Date(Date.now() - 86400000).toISOString().split("T")[0];
}

function computeBadges(
  tasks: Task[],
  completedIds: Set<string>,
  streak: number,
): Badge[] {
  const completedCount = tasks.filter((t) => completedIds.has(t.id)).length;
  const week1Tasks = tasks.filter((t) => t.day >= 1 && t.day <= 7);
  const launchDone = tasks.some((t) => t.isLaunchTask && completedIds.has(t.id));
  const redditDone = tasks.filter(
    (t) => t.platform === "reddit" && completedIds.has(t.id),
  ).length;
  const allDone = tasks.length > 0 && tasks.every((t) => completedIds.has(t.id));
  const week1Done =
    week1Tasks.length > 0 && week1Tasks.every((t) => completedIds.has(t.id));

  return [
    {
      id: "just-hatched", emoji: "🥚", name: "Just Hatched",
      description: "Complete your first task",
      unlocked: completedCount >= 1,
    },
    {
      id: "first-steps", emoji: "👣", name: "First Steps",
      description: "Complete 5 tasks",
      unlocked: completedCount >= 5,
    },
    {
      id: "taking-root", emoji: "🌱", name: "Taking Root",
      description: "Complete all of Week 1",
      unlocked: week1Done,
    },
    {
      id: "liftoff", emoji: "🚀", name: "Liftoff",
      description: "Complete your launch day task",
      unlocked: launchDone,
    },
    {
      id: "community-builder", emoji: "💬", name: "Community Builder",
      description: "Complete 3 Reddit tasks",
      unlocked: redditDone >= 3,
    },
    {
      id: "on-a-roll", emoji: "⭐", name: "On a Roll",
      description: "5-day streak",
      unlocked: streak >= 5,
    },
    {
      id: "full-flight", emoji: "🏆", name: "Full Flight",
      description: "Complete all 30 days",
      unlocked: allDone,
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfettiBurst() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible" }}
    >
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "7px",
              height: "7px",
              borderRadius: "2px",
              backgroundColor: p.color,
              "--tx": p.tx,
              "--ty": p.ty,
              animationDelay: p.delay,
              animation: "confetti-burst 0.85s ease-out forwards",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function BadgeItem({
  badge,
  celebrating,
}: {
  badge: Badge;
  celebrating: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1 group" title={badge.description}>
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300"
        style={
          badge.unlocked
            ? {
                background: "rgba(245,158,11,0.15)",
                border: "2px solid #F59E0B",
                animation: celebrating
                  ? "badge-glow 0.8s ease-in-out 3"
                  : undefined,
              }
            : {
                background: "rgba(255,255,255,0.04)",
                border: "2px solid rgba(255,255,255,0.1)",
                filter: "grayscale(1) opacity(0.35)",
              }
        }
      >
        {badge.emoji}
        {celebrating && <ConfettiBurst />}
      </div>
      <span
        className="text-[10px] leading-tight text-center max-w-[52px]"
        style={{ color: badge.unlocked ? "#F59E0B" : "#52525b" }}
      >
        {badge.name}
      </span>
    </div>
  );
}

function XpBar({
  current,
  total,
  streak,
}: {
  current: number;
  total: number;
  streak: number;
}) {
  const level = getLevel(current);
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-sm font-bold border"
            style={{
              background: "rgba(245,158,11,0.12)",
              borderColor: "#F59E0B",
              color: "#F59E0B",
            }}
          >
            {level.emoji} {level.name}
          </span>
          <span className="text-zinc-400 text-sm font-mono">
            <span className="text-amber-400 font-bold">{current}</span>
            {" / "}
            {total} XP
          </span>
        </div>
        {streak > 0 && (
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#FCA5A5",
            }}
          >
            🔥 {streak}-day streak!
          </div>
        )}
      </div>
      <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #D97706, #F59E0B, #FCD34D)",
            animation: "xp-fill 0.8s ease-out",
            transition: "width 0.4s ease-out",
          }}
        />
      </div>
    </div>
  );
}

function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  const colors: Record<Difficulty, string> = {
    easy:   "#4ade80",
    medium: "#fbbf24",
    hard:   "#f87171",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors[difficulty] }}
      title={difficulty}
    />
  );
}

function TaskItem({
  task,
  completed,
  onToggle,
}: {
  task: Task;
  completed: boolean;
  onToggle: (id: string) => void;
}) {
  const platform = PLATFORM_INFO[task.platform];

  return (
    <div
      className="rounded-lg border transition-all duration-200"
      style={{
        background: completed
          ? "rgba(245,158,11,0.06)"
          : "rgba(255,255,255,0.03)",
        borderColor: completed
          ? "rgba(245,158,11,0.3)"
          : "rgba(255,255,255,0.08)",
        borderLeftWidth: "3px",
        borderLeftColor: platform.color,
      }}
    >
      <div className="p-3 flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 mt-0.5"
          style={{
            background: completed ? "#F59E0B" : "transparent",
            borderColor: completed ? "#F59E0B" : "rgba(255,255,255,0.25)",
          }}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed && (
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              className="text-black"
            >
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p
              className="text-sm leading-snug"
              style={{
                color: completed ? "#71717a" : "#e4e4e7",
                textDecoration: completed ? "line-through" : "none",
              }}
            >
              {task.title}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#F59E0B",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                +{task.xp} XP
              </span>
            </div>
          </div>

          {/* Platform badge + difficulty */}
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
            <DifficultyDot difficulty={task.difficulty} />
          </div>

          {task.tip && (
            <p className="mt-2 text-xs text-zinc-500 leading-snug">
              <span className="text-zinc-600">→</span> {task.tip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DaySection({
  day,
  tasks,
  completedIds,
  onToggle,
}: {
  day: number;
  tasks: Task[];
  completedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const allDone = tasks.length > 0 && tasks.every((t) => completedIds.has(t.id));

  const celebrationMessages: Record<number, string> = {
    7:  "Week 1 down! You're already ahead of 90% of founders 🌱",
    14: "Two weeks in — the momentum is getting real 🚀",
    21: "Three weeks of consistent action. The compounding kicks in now 💪",
    30: "You actually did it. 30 days. Full flight 🏆",
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: allDone
              ? "rgba(245,158,11,0.15)"
              : "rgba(255,255,255,0.06)",
            color: allDone ? "#F59E0B" : "#a1a1aa",
            border: `1px solid ${allDone ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          Day {day}
          {allDone && <span className="ml-1">✅</span>}
        </div>
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            completed={completedIds.has(t.id)}
            onToggle={onToggle}
          />
        ))}
      </div>

      {allDone && (
        <div
          className="mt-3 px-4 py-2.5 rounded-lg text-sm font-medium text-center"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#FCD34D",
            animation: "slide-up 0.3s ease-out",
          }}
        >
          {celebrationMessages[day] ?? `Day ${day} done! You're on fire 🔥`}
        </div>
      )}
    </div>
  );
}

function WeekMilestoneBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-8 px-5 py-4 rounded-xl text-sm font-medium text-center leading-relaxed"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))",
        border: "1px solid rgba(245,158,11,0.25)",
        color: "#FCD34D",
      }}
    >
      {message}
    </div>
  );
}

function AILoadingCard() {
  return (
    <div className="flex justify-center mb-6">
      <div
        className="rounded-xl px-6 py-4 flex items-center gap-3"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: "#F59E0B" }}
        />
        <p className="text-amber-400 text-sm font-medium">🥚 Hatching your plan...</p>
      </div>
    </div>
  );
}

function MistakeWarningCard({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.3)",
      }}
    >
      <p className="text-sm font-medium" style={{ color: "#FCA5A5" }}>
        ⚠️ Watch out: {message}
      </p>
    </div>
  );
}

function PlatformInsightCard({
  platformName,
  insight,
}: {
  platformName: string;
  insight: PlatformInsight;
}) {
  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.25)",
        borderLeftWidth: "3px",
        borderLeftColor: "#F59E0B",
      }}
    >
      <p className="text-sm font-semibold text-amber-400 mb-2">
        🤖 AI Insight — {platformName}
      </p>
      {insight.communities && insight.communities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs text-zinc-500 self-center">Communities:</span>
          {insight.communities.map((c) => (
            <span
              key={c}
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "#FCD34D",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {insight.hook && (
        <p className="text-sm text-zinc-300 leading-snug">
          <span className="text-zinc-500 text-xs">Hook: </span>
          &ldquo;{insight.hook}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlanPageClient() {
  const searchParams = useSearchParams();

  const productName = searchParams.get("productName") ?? "Your Product";
  const platformsParam = searchParams.get("platforms") ?? "";
  const selectedPlatforms = platformsParam
    ? platformsParam.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  // Extra params for AI enrichment
  const productType = searchParams.get("productType") ?? "";
  const targetUser = searchParams.get("targetUser") ?? "";
  const willUsePlatformsParam = searchParams.get("willUsePlatforms") ?? "";

  const tasks = generatePlan(selectedPlatforms);
  const totalXp = tasks.reduce((sum, t) => sum + t.xp, 0);

  // State
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
  const [prevUnlockedIds, setPrevUnlockedIds] = useState<Set<string>>(new Set());
  const [celebratingBadgeId, setCelebratingBadgeId] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  const hasLoadedRef = useRef(false);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch AI insights on mount
  useEffect(() => {
    const willUsePlatforms = willUsePlatformsParam.split(",").map((p) => p.trim()).filter(Boolean);

    fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName,
        productType,
        audience: targetUser,
        platforms: willUsePlatforms,
      }),
      signal: AbortSignal.timeout(25000),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setInsights(data.insights);
      })
      .catch(() => {})
      .finally(() => setIsLoadingInsights(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedProgress = JSON.parse(raw);
        setCompletedIds(new Set(saved.completedTasks ?? []));
        setStreak(saved.streak ?? 0);
        setLastActivityDate(saved.lastActivityDate ?? null);
        setPrevUnlockedIds(new Set(saved.unlockedBadgeIds ?? []));
      }
    } catch {
      // ignore malformed data
    }
    hasLoadedRef.current = true;
  }, []);

  // Save to localStorage whenever state changes (but skip the initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try {
      const data: SavedProgress = {
        completedTasks: Array.from(completedIds),
        streak,
        lastActivityDate,
        unlockedBadgeIds: Array.from(prevUnlockedIds),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // quota exceeded or private mode — silently ignore
    }
  }, [completedIds, streak, lastActivityDate, prevUnlockedIds]);

  // Detect newly unlocked badges and trigger celebration
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const badges = computeBadges(tasks, completedIds, streak);
    const newlyUnlocked = badges.filter(
      (b) => b.unlocked && !prevUnlockedIds.has(b.id),
    );
    if (newlyUnlocked.length === 0) return;

    const newIds = newlyUnlocked.map((b) => b.id);
    setPrevUnlockedIds((prev) => new Set([...prev, ...newIds]));
    setCelebratingBadgeId(newIds[0]);

    if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    celebrateTimerRef.current = setTimeout(() => setCelebratingBadgeId(null), 2500);
  }, [completedIds, streak]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(
    (taskId: string) => {
      const isCompleting = !completedIds.has(taskId);

      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (isCompleting) next.add(taskId);
        else next.delete(taskId);
        return next;
      });

      if (isCompleting) {
        const today = getTodayString();
        if (lastActivityDate !== today) {
          const yesterday = getYesterdayString();
          setStreak(lastActivityDate === yesterday ? streak + 1 : 1);
          setLastActivityDate(today);
        }
      }
    },
    [completedIds, lastActivityDate, streak],
  );

  const currentXp = tasks
    .filter((t) => completedIds.has(t.id))
    .reduce((sum, t) => sum + t.xp, 0);

  const badges = computeBadges(tasks, completedIds, streak);

  // Group tasks by day for a given week
  function getWeekDays(weekNum: number): number[] {
    const [start, end] = WEEK_RANGES[weekNum - 1];
    const dayNums = new Set(
      tasks.filter((t) => t.day >= start && t.day <= end).map((t) => t.day),
    );
    return Array.from(dayNums).sort((a, b) => a - b);
  }

  function getTasksForDay(day: number) {
    return tasks.filter((t) => t.day === day);
  }

  function weekCompletionPct(weekNum: number): number {
    const [start, end] = WEEK_RANGES[weekNum - 1];
    const weekTasks = tasks.filter((t) => t.day >= start && t.day <= end);
    if (weekTasks.length === 0) return 0;
    const done = weekTasks.filter((t) => completedIds.has(t.id)).length;
    return Math.round((done / weekTasks.length) * 100);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </a>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Your 30-Day Hatchery Plan
          </h1>
          <p className="mt-1 text-zinc-400 text-sm">
            for{" "}
            <span className="text-amber-400 font-semibold">{productName}</span>
          </p>
        </div>

        {/* XP Bar */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <XpBar current={currentXp} total={totalXp} streak={streak} />
        </div>

        {/* Achievement Badges */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-zinc-500 text-xs font-medium mb-3 uppercase tracking-wider">
            Achievements
          </p>
          <div className="flex items-start gap-3 flex-wrap">
            {badges.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                celebrating={celebratingBadgeId === badge.id}
              />
            ))}
          </div>
        </div>

        {/* AI section */}
        {isLoadingInsights ? (
          <AILoadingCard />
        ) : (
          <>
            {insights?.biggestMistake && (
              <MistakeWarningCard message={insights.biggestMistake} />
            )}
            {insights?.platformInsights &&
              Object.entries(insights.platformInsights).map(([name, insight]) => (
                <PlatformInsightCard key={name} platformName={name} insight={insight} />
              ))}
          </>
        )}

        {/* Week Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[1, 2, 3, 4].map((w) => {
            const pct = weekCompletionPct(w);
            const isActive = activeWeek === w;
            return (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden"
                style={{
                  background: isActive
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? "#F59E0B" : "#71717a",
                }}
              >
                <span>Week {w}</span>
                {pct > 0 && (
                  <span
                    className="ml-1.5 text-xs font-normal"
                    style={{ color: isActive ? "#FCD34D" : "#52525b" }}
                  >
                    {pct}%
                  </span>
                )}
                {/* Bottom progress bar within the tab */}
                {pct > 0 && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5"
                    style={{
                      width: `${pct}%`,
                      background: isActive
                        ? "#F59E0B"
                        : "rgba(245,158,11,0.3)",
                      transition: "width 0.3s ease",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Week Content */}
        {[1, 2, 3, 4].map((w) =>
          activeWeek === w ? (
            <div key={w}>
              {/* Milestone banner for weeks 2-4 */}
              {w > 1 && (
                <WeekMilestoneBanner message={WEEK_MILESTONE_MESSAGES[w - 2]} />
              )}

              {getWeekDays(w).length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <p className="text-2xl mb-2">🐣</p>
                  <p className="text-sm">No tasks for this week yet.</p>
                </div>
              ) : (
                getWeekDays(w).map((day) => (
                  <DaySection
                    key={day}
                    day={day}
                    tasks={getTasksForDay(day)}
                    completedIds={completedIds}
                    onToggle={handleToggle}
                  />
                ))
              )}

              {/* Summary for this week */}
              <div
                className="mt-4 mb-2 text-right text-xs text-zinc-600"
              >
                {weekCompletionPct(w)}% of Week {w} complete
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
