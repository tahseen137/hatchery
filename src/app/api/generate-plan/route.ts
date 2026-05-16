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
    return new Response("data: [DONE]\n\n", {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const platformList = platforms.join(", ");
  const platformKeys = platforms.map((p) => `"${p}"`).join(", ");

  const prompt = `You are an expert startup launch advisor. Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

Product: "${productName}"
Selected distribution platforms: ${platformList}

Return exactly this structure:
{
  "platformInsights": { ${platformKeys.replace(/"/g, '"')}: "<2-3 sentence tactical insight specific to launching ${productName} on this platform>" },
  "biggestMistake": "<one concrete mistake founders typically make when launching on these specific platforms, 1-2 sentences>"
}

Include one entry in platformInsights for each of these platforms: ${platformList}.
Output ONLY the JSON object.`;

  let ollamaResp: Response;
  try {
    ollamaResp = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ollamaApiKey ?? ""}`,
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        options: { temperature: 0.5, num_predict: 512 },
      }),
    });
  } catch {
    return new Response("data: [DONE]\n\n", {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  if (!ollamaResp.ok || !ollamaResp.body) {
    return new Response("data: [DONE]\n\n", {
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
