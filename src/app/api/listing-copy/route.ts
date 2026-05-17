export const runtime = 'edge';
export const maxDuration = 60;

const PLATFORM_PROMPTS: Record<string, string> = {
  'chrome-web-store': `Generate Chrome Web Store listing copy. Reply with ONLY this JSON:
{
  "name": "product name (max 45 chars)",
  "shortDescription": "short description shown in search results (max 132 chars)",
  "description": "full store description — lead with benefits, use line breaks for readability (max 1000 chars)",
  "category": "most relevant Chrome Web Store category (e.g. Productivity, Developer Tools, etc.)"
}`,

  'app-store': `Generate Apple App Store listing copy. Reply with ONLY this JSON:
{
  "name": "app name (max 30 chars)",
  "subtitle": "short tagline shown below app name (max 30 chars)",
  "description": "full app description — lead with the core benefit, use bullet points or short paragraphs (max 4000 chars)",
  "keywords": "comma-separated keywords for App Store search (max 100 chars total)"
}`,

  'play-store': `Generate Google Play Store listing copy. Reply with ONLY this JSON:
{
  "title": "app title (max 50 chars)",
  "shortDescription": "short description shown in search results (max 80 chars)",
  "fullDescription": "full store description — use clear sections, highlight key features and benefits (max 4000 chars)"
}`,

  'product-hunt': `Generate Product Hunt launch copy. Reply with ONLY this JSON:
{
  "tagline": "punchy one-line description shown under the product name (max 60 chars)",
  "description": "2-3 sentences for the product description — what it does, who it's for, key differentiator",
  "firstComment": "3-4 sentences for the founder's first comment — your story, what problem you solved, invite feedback"
}`,
};

export async function POST(req: Request) {
  const { platform, productName, oneLiner, targetUser, productType } = await req.json() as {
    platform: 'chrome-web-store' | 'app-store' | 'play-store' | 'product-hunt';
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

  const platformInstructions = PLATFORM_PROMPTS[platform];
  if (!platformInstructions) {
    return new Response(`data: ${JSON.stringify("ERR:INVALID_PLATFORM")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const prompt = `Product: "${productName}"
Description: "${oneLiner}"
Product type: "${productType || "Software"}"
Target user: "${targetUser || "general consumers"}"

${platformInstructions}

Output ONLY the JSON object, no markdown, no explanation.`;

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
      redirect: 'follow',
    });
  } catch (e) {
    return new Response(`data: ${JSON.stringify("ERR:FETCH_FAILED:" + String(e))}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  if (ollamaResp.status === 307 || ollamaResp.status === 308 || ollamaResp.status === 301 || ollamaResp.status === 302) {
    const location = ollamaResp.headers.get('location');
    if (location) {
      try {
        ollamaResp = await fetch(location, {
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
        });
      } catch (e) {
        return new Response(`data: ${JSON.stringify("ERR:REDIRECT_FAILED:" + String(e))}\n\ndata: [DONE]\n\n`, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }
    }
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
              const parsed = JSON.parse(line) as {
                message?: { content?: string };
                done?: boolean;
              };
              const content = parsed.message?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
              }
              if (parsed.done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // skip malformed NDJSON
            }
          }
        }
      } catch (streamErr) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify("ERR:STREAM:" + String(streamErr))}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
