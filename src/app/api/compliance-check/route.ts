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

  const prompt = `You are a startup legal advisor. Reply with ONLY a JSON object, no markdown, no explanation.

Product: "${productName}"
Product type: "${productType || "Software"}"
Target user: "${targetUser || "general consumers"}"
Distribution platforms: ${platforms?.length ? platforms.join(", ") : "web"}

Return the 5 most important compliance and legal items this founder must address before or shortly after launching. Be specific to their product type and target user.

JSON format (output ONLY this JSON, no markdown):
{
  "items": [
    {
      "title": "Short title (5 words max)",
      "description": "1-2 sentences: what needs to be done and why it matters",
      "priority": "high"
    }
  ]
}

Priority values: "high" = must do before launch, "medium" = first 30 days, "low" = good to have soon.
Output ONLY the JSON object.`;

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
