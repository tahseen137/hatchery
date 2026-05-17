"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiInsights {
  hook: string;
  biggestMistake: string;
  quickWin: string;
}

interface FundingAiInsights {
  strongestSignal: string;
  biggestGap: string;
  thirtyDayFocus: string;
}

interface ComplianceItem {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

type AiStatus = "idle" | "streaming" | "done" | "error";
type ComplianceStatus = "idle" | "streaming" | "done" | "error";
type DraftStatus = "idle" | "loading" | "streaming" | "done" | "error";

interface DraftState {
  status: DraftStatus;
  text: string;
}

interface DebriefResult {
  verdict: "strong" | "decent" | "slow";
  highlight: string;
  gap: string;
  weekTwoFocus: string;
}

type PlatformId =
  | "reddit"
  | "producthunt"
  | "betalist"
  | "chrome"
  | "twitter"
  | "hn"
  | "newsletter"
  | "universal"
  | "investor";

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
  hasDraft?: boolean;
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
  investor:    { name: "Investor",     color: "#8B5CF6", emoji: "💰" },
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

const INVESTOR_WEEK_MILESTONE_MESSAGES = [
  "🌱 Week 1 done! Foundation laid. Most founders never start. You did.",
  "🤝 Week 2 done! First conversations happening. Keep the momentum.",
  "📈 Week 3 done! You're building deal flow. The close is getting closer.",
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

// ─── Investor Tasks ───────────────────────────────────────────────────────────

const INVESTOR_TASKS: Task[] = [
  // Week 1: Foundation
  { id: "inv-1",  day: 1,  platform: "investor", title: "Write your founder story — the 3 moments that led you here. Practice saying it in 90 seconds.", tip: "Investors fund people as much as ideas. A clear origin story builds instant trust.", xp: 25, difficulty: "medium" },
  { id: "inv-2",  day: 2,  platform: "investor", title: "Build a target list of 20 angels and micro-VCs who invest in your category. Add to a spreadsheet.", tip: "AngelList, Crunchbase, and LinkedIn are your tools. Look who funded similar companies.", xp: 25, difficulty: "medium" },
  { id: "inv-3",  day: 3,  platform: "investor", title: "Write your cold email template — problem, traction, ask. 5 sentences max. Then test it on a friend.", tip: "Cold emails that work: 1 line on what you do, 1 line on traction, 1 ask. That's it.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-4",  day: 4,  platform: "investor", title: "Prepare your one-paragraph traction summary. Numbers only. Growth rate beats absolute size.", tip: "Investors want momentum. '3x growth in 60 days' beats '300 users' every time.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-5",  day: 5,  platform: "investor", title: "Draft your 10-slide deck outline: problem, solution, market, traction, team, ask. Don't design yet.", tip: "Structure first. A clear outline catches logic gaps before you spend time on design.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-6",  day: 6,  platform: "investor", title: "Find 5 warm intro paths on LinkedIn. Map your network to investors on your list. Prioritize 2nd-degree.", tip: "Warm intros convert at 10x the rate of cold outreach. One good intro changes everything.", xp: 25, difficulty: "medium" },
  { id: "inv-7",  day: 7,  platform: "investor", title: "Send your first 5 cold emails to angels. Track opens and replies in your spreadsheet.", tip: "A/B test your subject line. '3x growth' vs 'Intro from a mutual' — both work differently.", xp: 50, difficulty: "hard", hasDraft: true },

  // Week 2: First Outreach
  { id: "inv-8",  day: 8,  platform: "investor", title: "Post a public traction update on Twitter or LinkedIn. Raw numbers, real growth, no spin.", tip: "Public milestones attract inbound investor interest. Post every major metric milestone.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-9",  day: 9,  platform: "investor", title: "Request 3 warm intros from your network. Be specific about which investor and why they're a fit.", tip: "Make it easy for the introducer. Draft the intro email for them — most will use it verbatim.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-10", day: 10, platform: "investor", title: "Apply to 2 accelerator programs (YC, Techstars, or others in your category). Applications take 1 hour.", tip: "Accelerator acceptance is a strong signal to angels. Apply even if you're not sure you'd accept.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-11", day: 11, platform: "investor", title: "Build your data room: deck, key metrics dashboard, cap table. Organize in Google Drive or Notion.", tip: "A tidy data room signals operational maturity. Investors notice when things are hard to find.", xp: 50, difficulty: "hard" },
  { id: "inv-12", day: 12, platform: "investor", title: "Send 10 more cold emails from your investor list. Personalize the opening line for each.", tip: "Reference something specific about their portfolio. 'I saw you backed X' converts better than generic.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-13", day: 13, platform: "investor", title: "First angel coffee chat. Come with 3 questions, not a pitch. Listen 80% of the time.", tip: "The best first investor meeting is a conversation, not a presentation. Ask for their perspective.", xp: 50, difficulty: "hard" },
  { id: "inv-14", day: 14, platform: "investor", title: "Refine your deck: add a clear 'why now' slide and your unfair advantage. Cut anything that doesn't earn its slide.", tip: "Every slide should answer 'so what?' If it doesn't, cut it.", xp: 25, difficulty: "medium" },

  // Week 3: Building Momentum
  { id: "inv-15", day: 15, platform: "investor", title: "Apply to 2 more accelerators with a polished application based on your first attempt.", tip: "Iterate on applications. Each one sharpens how you tell your story.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-16", day: 16, platform: "investor", title: "Follow up on cold emails sent 7+ days ago. One short, friendly nudge. Reply rates double on follow-up.", tip: "Subject: 'Re: [original subject]'. Body: 2 sentences. Zero pressure. This is the most underused move.", xp: 10, difficulty: "easy", hasDraft: true },
  { id: "inv-17", day: 17, platform: "investor", title: "Share a specific traction milestone publicly — a revenue update, usage number, or customer story.", tip: "Specificity builds credibility. '500 active users' beats 'growing fast' in every investor's mind.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-18", day: 18, platform: "investor", title: "Schedule 3 more angel coffee chats. Prioritize investors who backed founders in your niche.", tip: "Pattern-matching investors are faster to close. They've seen your business model win before.", xp: 25, difficulty: "medium" },
  { id: "inv-19", day: 19, platform: "investor", title: "Add 18-month financial projections to your data room. Keep assumptions clear and conservative.", tip: "Investors don't expect perfection — they want to see that you think clearly about unit economics.", xp: 50, difficulty: "hard" },
  { id: "inv-20", day: 20, platform: "investor", title: "Send warm intro asks to 5 investors via founder connections. Attach a 1-page overview.", tip: "A 1-pager (problem/solution/traction/ask) gives the introducer something to forward instantly.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-21", day: 21, platform: "investor", title: "Write a one-page summary of your top 5 investor conversation learnings. What objections keep coming up?", tip: "Recurring objections = gaps in your story. Address them proactively in your deck.", xp: 25, difficulty: "medium", hasDraft: true },

  // Week 4: Closing
  { id: "inv-22", day: 22, platform: "investor", title: "Coffee chats #4 and #5. By now you should have a tight pitch. Notice what lands and what doesn't.", tip: "By conversation 5 your pattern-matching kicks in. You'll know what the 'real' objection is.", xp: 50, difficulty: "hard" },
  { id: "inv-23", day: 23, platform: "investor", title: "Post 'what 30 investor conversations taught me' thread. Vulnerability + insight travels far.", tip: "This post often generates inbound investor interest. Founders who learn publicly attract backers.", xp: 50, difficulty: "hard", hasDraft: true },
  { id: "inv-24", day: 24, platform: "investor", title: "Send personal follow-ups to the 3 warmest prospects. Reference something from your last conversation.", tip: "Mentioning something specific they said shows you listen. That stands out in a crowded inbox.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-25", day: 25, platform: "investor", title: "Read up on standard term sheet terms: valuation cap, discount rate, pro-rata rights. 1 hour of prep.", tip: "Walking into a term sheet conversation unprepared is expensive. One hour now saves thousands later.", xp: 10, difficulty: "easy" },
  { id: "inv-26", day: 26, platform: "investor", title: "Ask 2 founder friends for warm intros to investors they know personally. Pay it forward later.", tip: "Founders helping founders is the engine of the startup ecosystem. Ask directly and specifically.", xp: 25, difficulty: "medium", hasDraft: true },
  { id: "inv-27", day: 27, platform: "investor", title: "Schedule follow-up calls with the 2-3 most interested investors. Come with updated traction numbers.", tip: "Fresh traction numbers on a follow-up call signal momentum. Update your deck the night before.", xp: 25, difficulty: "medium" },
  { id: "inv-28", day: 28, platform: "investor", title: "Finalize your deck for closing conversations. Every word earns its place. Cut to 10 slides max.", tip: "Less is more. The best decks leave investors with more questions, not fewer.", xp: 50, difficulty: "hard" },
  { id: "inv-29", day: 29, platform: "investor", title: "Organize all legal docs for potential due diligence: incorporation, IP assignments, contracts.", tip: "Clean legal house = faster close. Messy cap tables and missing assignments kill deals in due diligence.", xp: 25, difficulty: "medium" },
  { id: "inv-30", day: 30, platform: "investor", title: "🚀 Write your public fundraising story — what you learned, what surprised you, what you'd do differently.", tip: "This post becomes a magnet for future investors, hires, and customers. Your journey is your moat.", xp: 50, difficulty: "hard", hasDraft: true, isLaunchTask: true },
];

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
      xp: 50, difficulty: "hard", hasDraft: true,
    },
    {
      id: "u-30", day: 30, platform: "universal",
      title: "Write your '30 days of launching' post. This is your story — share it everywhere. You earned it.",
      tip: "Authentic founder stories get 10x the engagement of polished marketing. Be honest.",
      xp: 50, difficulty: "hard", hasDraft: true,
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
        xp: 50, difficulty: "hard", hasDraft: true,
      },
      {
        id: "r-12", day: 12, platform: "reddit",
        title: "🚀 Post your product to the most relevant subreddit. Answer EVERY comment within 2 hours. Be there.",
        tip: "Engagement in the first hour determines how much Reddit boosts your post.",
        xp: 50, difficulty: "hard", isLaunchTask: true, hasDraft: true,
      },
      {
        id: "r-20", day: 20, platform: "reddit",
        title: "Post to a second subreddit with a completely different angle. Same product, new story.",
        tip: "Different subreddits care about different things. Reframe — don't copy-paste.",
        xp: 50, difficulty: "hard", hasDraft: true,
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
        xp: 50, difficulty: "hard", hasDraft: true,
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
        xp: 25, difficulty: "medium", hasDraft: true,
      },
      {
        id: "tw-3", day: 3, platform: "twitter",
        title: "Tweet the problem you're solving. Describe the pain without pitching your solution. Make people nod.",
        tip: "Problem tweets get shared. Solution tweets get ignored. Lead with the pain.",
        xp: 25, difficulty: "medium", hasDraft: true,
      },
      {
        id: "tw-7", day: 7, platform: "twitter",
        title: "Drop your launch thread: problem → solution → demo GIF → link. Pin it to your profile right after.",
        tip: "One GIF showing your product in action is worth more than a thousand feature bullets.",
        xp: 50, difficulty: "hard", isLaunchTask: true, hasDraft: true,
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
        xp: 50, difficulty: "hard", hasDraft: true,
      },
    );
  }

  if (platforms.includes("hn")) {
    tasks.push(
      {
        id: "hn-5", day: 5, platform: "hn",
        title: "Write your Show HN post. Format: 'Show HN: [Product] – [one-liner]'. Keep it humble. HN loves that.",
        tip: "HN loves brevity and honesty. If your description is over 10 words, cut it.",
        xp: 50, difficulty: "hard", hasDraft: true,
      },
      {
        id: "hn-6", day: 6, platform: "hn",
        title: "🚀 Post Show HN at 9am EST on a weekday. Camp the thread for 2 hours. Answer everything.",
        tip: "The HN front page is decided in the first 2 hours. Be completely present.",
        xp: 50, difficulty: "hard", isLaunchTask: true, hasDraft: true,
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
        xp: 25, difficulty: "medium", hasDraft: true,
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
  productName,
  oneLiner,
  draftState,
  onDraft,
}: {
  task: Task;
  completed: boolean;
  onToggle: (id: string) => void;
  productName: string;
  oneLiner: string;
  draftState?: DraftState;
  onDraft: (taskId: string, task: Task) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const platform = PLATFORM_INFO[task.platform];

  const handleDraftClick = () => {
    setPanelOpen(true);
    if (!draftState || draftState.status === "idle") {
      onDraft(task.id, task);
    }
  };

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
                  background: "rgba(245,158,11,0.1)",
                  color: "#F59E0B",
                }}
              >
                +{task.xp} XP
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: `${platform.color}18`,
                  color: platform.color,
                }}
              >
                {platform.emoji} {platform.name}
              </span>
              <DifficultyDot difficulty={task.difficulty} />
            </div>
          </div>

          {task.tip && (
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed italic">
              💡 {task.tip}
            </p>
          )}

          {task.hasDraft && (
            <button
              type="button"
              onClick={handleDraftClick}
              className="mt-2 text-xs px-3 py-1.5 rounded-md font-semibold transition-all"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "#F5A623",
              }}
            >
              {draftState?.status === "loading" || draftState?.status === "streaming"
                ? "✍ Generating…"
                : panelOpen
                ? "▲ Hide Draft"
                : "✍ Draft with AI"}
            </button>
          )}

          {panelOpen && draftState && (
            <div
              className="mt-2 rounded-lg p-3"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {(draftState.status === "loading" || draftState.status === "streaming") && !draftState.text && (
                <p className="text-xs text-zinc-500">
                  Generating draft
                  <span className="inline-block w-1.5 h-3 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                </p>
              )}
              {draftState.text && (
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono break-words">
                  {draftState.text}
                  {draftState.status === "streaming" && (
                    <span className="inline-block w-1.5 h-3 ml-0.5 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                  )}
                </pre>
              )}
              {draftState.status === "done" && draftState.text && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(draftState.text)}
                  className="mt-2 text-xs px-2.5 py-1 rounded font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#a1a1aa",
                  }}
                >
                  Copy
                </button>
              )}
              {draftState.status === "error" && (
                <p className="text-xs text-red-400">Failed to generate — try again</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const celebrationMessages: Record<number, string> = {
  1:  "Day 1 done! The journey of a thousand users starts with a single step. 🥚",
  7:  "Week 1 complete! You've already lapped everyone who quit on day 3. 🎉",
  14: "Two weeks in! You're building momentum now. Keep going. 💪",
  30: "Day 30! You finished. That's extraordinarily rare. Take a bow. 🏆",
};

function DaySection({
  day,
  tasks,
  completedIds,
  onToggle,
  productName,
  oneLiner,
  drafts,
  onDraft,
}: {
  day: number;
  tasks: Task[];
  completedIds: Set<string>;
  onToggle: (id: string) => void;
  productName: string;
  oneLiner: string;
  drafts: Record<string, DraftState>;
  onDraft: (taskId: string, task: Task) => void;
}) {
  const allDone = tasks.length > 0 && tasks.every((t) => completedIds.has(t.id));

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: allDone ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
            color: allDone ? "#F59E0B" : "#52525b",
            border: `1px solid ${allDone ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          Day {day}
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            completed={completedIds.has(t.id)}
            onToggle={onToggle}
            productName={productName}
            oneLiner={oneLiner}
            draftState={drafts[t.id]}
            onDraft={onDraft}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlanPageClient() {
  const searchParams = useSearchParams();

  const productName  = searchParams.get("productName")  ?? "Your Product";
  const oneLiner     = searchParams.get("oneLiner")      ?? "";
  const productType  = searchParams.get("productType")   ?? "";
  const targetUser   = searchParams.get("targetUser")    ?? "";
  const platformsParam = searchParams.get("platforms")  ?? "";
  const goal         = searchParams.get("goal")          ?? "traction";

  const selectedPlatforms = platformsParam
    ? platformsParam.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const isFunding = goal === "funding";

  const tasks = isFunding ? INVESTOR_TASKS : generatePlan(selectedPlatforms);
  const totalXp = tasks.reduce((sum, t) => sum + t.xp, 0);

  // State
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
  const [prevUnlockedIds, setPrevUnlockedIds] = useState<Set<string>>(new Set());
  const [celebratingBadgeId, setCelebratingBadgeId] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);

  const [streamingText, setStreamingText] = useState("");
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [fundingInsights, setFundingInsights] = useState<FundingAiInsights | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");

  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>("idle");
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [debriefStatus, setDebriefStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [debriefData, setDebriefData] = useState<DebriefResult | null>(null);

  const hasLoadedRef = useRef(false);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiStartedRef = useRef(false);

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

  // Stream AI insights on mount
  useEffect(() => {
    if (aiStartedRef.current) return;
    if (!isFunding && selectedPlatforms.length === 0) return;
    aiStartedRef.current = true;
    setAiStatus("streaming");

    (async () => {
      try {
        const resp = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productName, platforms: selectedPlatforms, goal }),
        });

        if (!resp.ok || !resp.body) { setAiStatus("error"); return; }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const data = dataLine.slice(6);

            if (data === "[DONE]") {
              try {
                const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("no JSON found");
                if (isFunding) {
                  const parsed = JSON.parse(jsonMatch[0]) as FundingAiInsights;
                  if (!parsed.strongestSignal) throw new Error("missing fields");
                  setFundingInsights(parsed);
                } else {
                  const parsed = JSON.parse(jsonMatch[0]) as AiInsights;
                  if (!parsed.biggestMistake) throw new Error("missing fields");
                  setAiInsights(parsed);
                }
                setAiStatus("done");
              } catch {
                setAiStatus("error");
              }
              return;
            }

            try {
              const chunk = JSON.parse(data) as string;
              accumulated += chunk;
              setStreamingText(accumulated);
            } catch {
              // skip malformed chunk
            }
          }
        }

        setAiStatus("error");
      } catch {
        setAiStatus("error");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDraft = useCallback(async (taskId: string, task: Task) => {
    setDrafts((prev) => ({ ...prev, [taskId]: { status: "loading", text: "" } }));
    try {
      const resp = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          taskTitle: task.title,
          platform: task.platform,
          productName,
          oneLiner,
        }),
      });
      if (!resp.ok || !resp.body) {
        setDrafts((prev) => ({ ...prev, [taskId]: { status: "error", text: "" } }));
        return;
      }
      setDrafts((prev) => ({ ...prev, [taskId]: { status: "streaming", text: "" } }));
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
            setDrafts((prev) => ({ ...prev, [taskId]: { status: "done", text: accumulated } }));
            return;
          }
          try {
            const chunk = JSON.parse(data) as string;
            accumulated += chunk;
            setDrafts((prev) => ({ ...prev, [taskId]: { status: "streaming", text: accumulated } }));
          } catch {
            // skip malformed chunk
          }
        }
      }
      setDrafts((prev) => ({ ...prev, [taskId]: { status: "done", text: accumulated } }));
    } catch {
      setDrafts((prev) => ({ ...prev, [taskId]: { status: "error", text: "" } }));
    }
  }, [productName, oneLiner]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDebrief = useCallback(async () => {
    setDebriefStatus("streaming");
    const week1Tasks = tasks.filter((t) => t.day >= 1 && t.day <= 7);
    const completedTitles = week1Tasks.filter((t) => completedIds.has(t.id)).map((t) => t.title);
    const missedTitles = week1Tasks.filter((t) => !completedIds.has(t.id)).map((t) => t.title);
    try {
      const resp = await fetch("/api/week-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          platforms: selectedPlatforms,
          completedTaskTitles: completedTitles,
          missedTaskTitles: missedTitles,
        }),
      });
      if (!resp.ok || !resp.body) { setDebriefStatus("error"); return; }
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
              const parsed: DebriefResult = JSON.parse(jsonMatch[0]);
              setDebriefData(parsed);
              setDebriefStatus("done");
            } catch {
              setDebriefStatus("error");
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
      setDebriefStatus("error");
    } catch {
      setDebriefStatus("error");
    }
  }, [tasks, completedIds, selectedPlatforms, productName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplianceCheck = useCallback(async () => {
    setComplianceStatus("streaming");
    setComplianceItems([]);
    try {
      const resp = await fetch("/api/compliance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productType, targetUser, platforms: selectedPlatforms }),
      });
      if (!resp.ok || !resp.body) { setComplianceStatus("error"); return; }
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
              const parsed = JSON.parse(jsonMatch[0]) as { items: ComplianceItem[] };
              setComplianceItems(parsed.items ?? []);
              setComplianceStatus("done");
            } catch {
              setComplianceStatus("error");
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
      setComplianceStatus("error");
    } catch {
      setComplianceStatus("error");
    }
  }, [productName, productType, targetUser, selectedPlatforms]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentXp = tasks
    .filter((t) => completedIds.has(t.id))
    .reduce((sum, t) => sum + t.xp, 0);

  const badges = computeBadges(tasks, completedIds, streak);

  const week1HasAnyCompleted = tasks.some((t) => t.day >= 1 && t.day <= 7 && completedIds.has(t.id));

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

  const showAiSection = (isFunding || selectedPlatforms.length > 0) && aiStatus !== "idle";

  const milestoneMessages = isFunding ? INVESTOR_WEEK_MILESTONE_MESSAGES : WEEK_MILESTONE_MESSAGES;

  // Build tools row URLs
  const toolsParams = new URLSearchParams({ productName });
  const docsUrl = `/tools/docs?${toolsParams.toString()}`;
  const listingUrlParams = new URLSearchParams({ productName, oneLiner, targetUser, productType });
  const listingUrl = `/tools/listing?${listingUrlParams.toString()}`;

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
            {isFunding ? "Your 30-Day Fundraising Plan" : "Your 30-Day Hatchery Plan"}
          </h1>
          <p className="mt-1 text-zinc-400 text-sm">
            for{" "}
            <span className="text-amber-400 font-semibold">{productName}</span>
            {isFunding && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", color: "#a78bfa" }}>
                💰 Investor track
              </span>
            )}
          </p>
        </div>

        {/* AI Insights */}
        {showAiSection && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-zinc-500 text-xs font-medium mb-3 uppercase tracking-wider">
              🤖 AI Insights
            </p>

            {(aiStatus === "streaming" || (aiStatus === "error" && streamingText)) && (
              <div className="font-mono text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed break-words">
                {streamingText || <span className="text-zinc-600">Analyzing your strategy…</span>}
                {aiStatus === "streaming" && (
                  <span
                    className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse"
                    style={{ background: "#F59E0B" }}
                  />
                )}
              </div>
            )}

            {aiStatus === "done" && !isFunding && aiInsights && (
              <div className="flex flex-col gap-3">
                {aiInsights.hook && (
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <p className="text-xs font-semibold text-amber-400 mb-1">🎣 Your Hook</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{aiInsights.hook}</p>
                  </div>
                )}
                {aiInsights.quickWin && (
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
                  >
                    <p className="text-xs font-semibold text-green-400 mb-1">⚡ Quick Win</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{aiInsights.quickWin}</p>
                  </div>
                )}
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <p className="text-xs font-semibold text-red-400 mb-1">⚠ Watch Out</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{aiInsights.biggestMistake}</p>
                </div>
              </div>
            )}

            {aiStatus === "done" && isFunding && fundingInsights && (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>📡 Strongest Signal</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{fundingInsights.strongestSignal}</p>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <p className="text-xs font-semibold text-red-400 mb-1">🔍 Biggest Gap</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{fundingInsights.biggestGap}</p>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <p className="text-xs font-semibold text-amber-400 mb-1">🎯 30-Day Focus</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{fundingInsights.thirtyDayFocus}</p>
                </div>
              </div>
            )}

            {/* Compliance Check */}
            {aiStatus === "done" && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {complianceStatus === "idle" && (
                  <button
                    type="button"
                    onClick={handleComplianceCheck}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      color: "#F5A623",
                    }}
                  >
                    ⚖️ Compliance Check — legal items before launch
                  </button>
                )}

                {complianceStatus === "streaming" && (
                  <div className="py-2 text-center text-zinc-500 text-sm">
                    Checking compliance…
                    <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                  </div>
                )}

                {complianceStatus === "done" && complianceItems.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs font-medium mb-3 uppercase tracking-wider">⚖️ Compliance Checklist</p>
                    <div className="flex flex-col gap-2">
                      {complianceItems.map((item, i) => {
                        const priorityConfig = {
                          high:   { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   badge: "rgba(239,68,68,0.15)",   badgeBorder: "rgba(239,68,68,0.4)",   color: "#f87171",  label: "HIGH"   },
                          medium: { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  badge: "rgba(245,158,11,0.15)",  badgeBorder: "rgba(245,158,11,0.4)",  color: "#fbbf24",  label: "MED"    },
                          low:    { bg: "rgba(74,222,128,0.06)",  border: "rgba(74,222,128,0.15)", badge: "rgba(74,222,128,0.12)",  badgeBorder: "rgba(74,222,128,0.3)",  color: "#4ade80",  label: "LOW"    },
                        }[item.priority] ?? { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", badge: "rgba(255,255,255,0.06)", badgeBorder: "rgba(255,255,255,0.1)", color: "#a1a1aa", label: "?" };
                        return (
                          <div
                            key={i}
                            className="rounded-lg p-3"
                            style={{ background: priorityConfig.bg, border: `1px solid ${priorityConfig.border}` }}
                          >
                            <div className="flex items-start gap-2 justify-between">
                              <p className="text-sm font-semibold text-zinc-200 leading-snug">{item.title}</p>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: priorityConfig.badge, border: `1px solid ${priorityConfig.badgeBorder}`, color: priorityConfig.color }}
                              >
                                {priorityConfig.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {complianceStatus === "error" && (
                  <p className="text-sm text-red-400 text-center py-2">Failed to check compliance — try again</p>
                )}
              </div>
            )}
          </div>
        )}

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
              {w > 1 && (
                <WeekMilestoneBanner message={milestoneMessages[w - 2]} />
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
                    productName={productName}
                    oneLiner={oneLiner}
                    drafts={drafts}
                    onDraft={handleDraft}
                  />
                ))
              )}

              {/* Week 1 Debrief */}
              {w === 1 && week1HasAnyCompleted && (
                <div className="mt-6 mb-4">
                  {debriefStatus === "idle" && (
                    <button
                      type="button"
                      onClick={handleDebrief}
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#F5A623",
                      }}
                    >
                      📊 Get Week 1 Debrief
                    </button>
                  )}

                  {debriefStatus === "streaming" && (
                    <div className="py-4 text-center text-zinc-500 text-sm">
                      Analyzing your week 1…
                      <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "#F59E0B" }} />
                    </div>
                  )}

                  {debriefStatus === "done" && debriefData && (() => {
                    const verdictConfig = {
                      strong: { label: "🔥 Strong Start", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", color: "#4ade80" },
                      decent: { label: "👍 Decent Start", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", color: "#fbbf24" },
                      slow:   { label: "🐌 Slow Start",   bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  color: "#f87171" },
                    }[debriefData.verdict];
                    return (
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">📊 Week 1 Debrief</p>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: verdictConfig.bg, border: `1px solid ${verdictConfig.border}`, color: verdictConfig.color }}
                          >
                            {verdictConfig.label}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                            <p className="text-xs font-semibold text-green-400 mb-1">✅ Highlight</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">{debriefData.highlight}</p>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <p className="text-xs font-semibold text-red-400 mb-1">⚠ Gap</p>
                            <p className="text-sm text-zinc-400 leading-relaxed">{debriefData.gap}</p>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            <p className="text-xs font-semibold text-amber-400 mb-1">🎯 Week 2 Focus</p>
                            <p className="text-sm text-zinc-400 leading-relaxed">{debriefData.weekTwoFocus}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {debriefStatus === "error" && (
                    <p className="text-sm text-red-400 text-center py-3">Failed to generate debrief — try again</p>
                  )}
                </div>
              )}

              {/* Summary for this week */}
              <div className="mt-4 mb-2 text-right text-xs text-zinc-600">
                {weekCompletionPct(w)}% of Week {w} complete
              </div>
            </div>
          ) : null,
        )}

        {/* Tools row */}
        <div
          className="mt-8 pt-6 flex items-center gap-3 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-zinc-600 text-xs font-medium mr-1">Tools:</span>
          <a
            href={docsUrl}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#71717a",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#e4e4e7"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#71717a"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            📄 Legal Docs
          </a>
          <a
            href={listingUrl}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#71717a",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#e4e4e7"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#71717a"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            📦 Store Listing
          </a>
        </div>
      </div>
    </div>
  );
}
