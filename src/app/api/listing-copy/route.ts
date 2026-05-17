export const runtime = 'edge';
export const maxDuration = 60;

const PLATFORM_PROMPTS: Record<string, string> = {
  "chrome-web-store": `Generate Chrome Web Store listing copy. Reply with ONLY a JSON object:
{ "name": "...", "shortDescription": "...", "description": "...", "category": "..." }
Limits: name ≤45 chars, shortDescription ≤132 chars, description ≤1000 chars.
Category must be one of: Productivity, Developer Tools, Entertainment, Shopping, Social & Communication, Other.
Make the copy compelling and keyword-rich for discoverability.`,

  "app-store": `Generate Apple App Store listing copy. Reply with ONLY a JSON object:
{ "name": "...", "subtitle": "...", "description": "...", "keywords": "..." }
Limits: name ≤30 chars, subtitle ≤30 chars, description ≤4000 chars, keywords ≤100 chars (comma-separated).
The description should have a punchy first paragraph, then feature bullets, then a call to action.`,

  "play-store": `Generate Google Play Store listing copy. Reply with ONLY a JSON object:
{ "title": "...", "shortDescription": "...", "fullDescription": "..." }
Limits: title ≤50 chars, shortDescription ≤80 chars, fullDescription ≤4000 chars.
fullDescription should open with the core benefit, use bullet points for features, and close with a CTA.`,

  "product-hunt": `Generate Product Hunt listing copy. Reply with ONLY a JSON object:
{ "tagline": "...", "description": "...", "firstComment": "..." }
Limits: tagline ≤60 chars (punchy, no "the" at start), description 2-3 sentences (what it does + who it's for), firstComment 3-4 sentences (founder's personal story + problem + invite for feedback).
The tagline should be memorable and action-oriented.`,
};

export async function POST(req: Request) {
  const { platform, productName, oneLiner, targetUser, productType } = await req.json() as {
    platform: "chrome-web-store" | "app-store" | "play-store" | "product-hunt";
    productName: string;
    oneLiner: string;
    targetUser: string;
    productType: string;
  };

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl) {
    return new Response(`data: ${JSON.stringify("ERR:NO_OLLAMA_URL")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const platformInstruction = PLATFORM_PROMPTS[platform] ?? PLATFORM_PROMPTS["product-hunt"];

  const prompt = `You are a conversion copywriter specializing in app store listings.

Product: "${productName}"
Description: "${oneLiner}"
Product type: ${productType || "Software"}
Target user: ${targetUser || "General users"}

${platformInstruction}

Output ONLY the JSON. No markdown, no explanation.`;

  let ollamaResp: Response;
  try {
    ollamaResp = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ollamaApiKey ?? ""}`,
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        think: false,
        options: { temperature: 0.6, num_predict: 2048 },
      }),
      redirect: "follow",
    });
  } catch (e) {
    return new Response(`data: ${JSON.stringify("ERR:FETCH_FAILED:" + String(e))}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  if (!ollamaResp.ok || !ollamaResp.body) {
    return new Response(`data: ${JSON.stringify("ERR:STATUS:" + ollamaResp.status)}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const upstream = ollamaResp.body;
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
              const content = parsed.message?.content;
              if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
              if (parsed.done) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch { /* skip malformed */ }
          }
        }
      } catch (streamErr) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify("ERR:" + String(streamErr))}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
