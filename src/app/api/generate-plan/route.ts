import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "https://sage-ollama.rewardly.ca";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? "Rewardly0705032";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:26b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, productType, audience, platforms, launchStatus, userCount } = body;

    const prompt = `You are a distribution expert for indie founders. Given this product, generate specific, actionable distribution advice.

Product: ${productName}
Type: ${productType}
Target audience: ${audience}
Selected platforms: ${Array.isArray(platforms) ? platforms.join(", ") : platforms}
Launch status: ${launchStatus}
Current users: ${userCount}

For each selected platform, provide:
1. The 2-3 most relevant specific communities/subreddits/channels to target (with exact names)
2. The best angle/hook to lead with for this specific product and audience
3. One specific tip that most founders miss on this platform
4. The optimal timing (day of week, time of day if relevant)

Respond in JSON format:
{
  "platformInsights": {
    "Reddit": {
      "communities": ["r/specific1", "r/specific2"],
      "hook": "Lead with...",
      "proTip": "Most founders...",
      "timing": "Tuesday-Thursday..."
    },
    "Product Hunt": {
      "communities": ["Product Hunt launch day community"],
      "hook": "Lead with...",
      "proTip": "Most founders...",
      "timing": "Tuesday-Thursday 12:01am PST..."
    }
  },
  "customOneLiner": "A sharper one-liner suggestion for this specific product",
  "biggestMistakeToAvoid": "The #1 thing founders of this type of product get wrong"
}

Only include platforms from the selected list. Be specific, not generic.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OLLAMA_API_KEY}`,
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ success: false, error: `Ollama returned ${response.status}` });
      }

      const data = await response.json();
      const content: string = data.message?.content ?? "";

      // Strip markdown code fences if present
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.trim();

      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({ success: true, insights: parsed });
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ success: false, error: message });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" });
  }
}
