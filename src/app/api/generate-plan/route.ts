import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60

const OLLAMA_URL = process.env.OLLAMA_URL ?? "https://sage-ollama.rewardly.ca";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? "Rewardly0705032";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:26b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, productType, audience, platforms } = body;

    const prompt = `You are a startup distribution expert. Give specific, actionable advice for this product launch.

Product: ${productName} (${productType})
Audience: ${audience}
Platforms to use: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}

For each platform listed, respond with ONLY this JSON (no explanation, no markdown):
{
  "platformInsights": {
    "Reddit": {
      "communities": ["r/name1", "r/name2"],
      "hook": "One specific opening angle for this product"
    },
    "Product Hunt": {
      "communities": ["hunters to target"],
      "hook": "Best tagline angle"
    }
  },
  "biggestMistake": "One sentence on the #1 mistake founders make launching this type of product"
}

Only include platforms from: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
Be specific to this product. No generic advice.`;

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
        signal: AbortSignal.timeout(25000),
      });

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
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ success: false, error: message });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" });
  }
}
