export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { productName, productType, targetUser, platforms } = await req.json() as {
    productName: string;
    productType: string;
    targetUser: string;
    platforms: string[];
  };

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl) {
    return new Response(`data: ${JSON.stringify("ERR:NO_OLLAMA_URL")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const prompt = `You are a legal compliance expert for tech startups. Reply with ONLY a JSON object, no markdown, no explanation.

Product: "${productName}"
Product Type: ${productType || "Software"}
Target User: ${targetUser || "General public"}
Launch Platforms: ${platforms?.join(", ") || "Web"}

List the 5 most important compliance and legal items this product must address before launch. Be specific and actionable for this product type and audience.

JSON format:
{
  "items": [
    { "title": "Short title", "description": "1-2 sentence actionable description", "priority": "high" },
    { "title": "Short title", "description": "1-2 sentence actionable description", "priority": "medium" },
    { "title": "Short title", "description": "1-2 sentence actionable description", "priority": "low" }
  ]
}

Priority must be exactly "high", "medium", or "low". Output ONLY the JSON.`;

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
