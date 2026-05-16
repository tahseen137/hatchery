export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { productName, platforms } = await req.json() as {
    productName: string;
    platforms: string[];
  };

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl || !platforms?.length) {
    const reason = !ollamaUrl ? `NO_OLLAMA_URL(keys=${Object.keys(process.env).filter(k=>k.includes('OLLAMA')).join(',')})` : `NO_PLATFORMS(url=${ollamaUrl})`;
    return new Response(`data: ${JSON.stringify('ERR:' + reason)}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const platformList = platforms.join(", ");

  // Simplified prompt — no per-platform JSON keys (avoids key mismatch issues)
  const prompt = `You are a startup launch expert. Reply with ONLY a JSON object, no markdown, no explanation.

Product: "${productName}"
Platforms: ${platformList}

JSON format:
{
  "hook": "One punchy sentence to open every post on these platforms",
  "biggestMistake": "The #1 mistake founders make launching on ${platformList}",
  "quickWin": "The single fastest action to get first traction"
}

Output ONLY the JSON.`;

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
        options: { temperature: 0.6, num_predict: 300 },
      }),
      redirect: 'follow',
    });
  } catch (e) {
    const msg = `ERR:FETCH_FAILED:${String(e)}`;
    return new Response(`data: ${JSON.stringify(msg)}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // Handle redirects manually (edge runtime doesn't reliably follow POST redirects)
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
            options: { temperature: 0.6, num_predict: 300 },
          }),
        });
      } catch (e) {
        const msg = `ERR:REDIRECT_FETCH_FAILED:${location}:${String(e)}`;
        return new Response(`data: ${JSON.stringify(msg)}\n\ndata: [DONE]\n\n`, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }
    }
  }

  if (!ollamaResp.ok || !ollamaResp.body) {
    const calledUrl = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
    const msg = `ERR:STATUS:${ollamaResp.status} calledUrl=${calledUrl} model=${ollamaModel}`;
    return new Response(`data: ${JSON.stringify(msg)}\n\ndata: [DONE]\n\n`, {
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
              if (parsed.message?.content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(parsed.message.content)}\n\n`)
                );
              }
              if (parsed.done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // skip malformed NDJSON lines
            }
          }
        }
      } catch {
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
