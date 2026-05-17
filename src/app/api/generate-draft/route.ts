export const runtime = 'edge';
export const maxDuration = 60;

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  reddit: "Write a Reddit post for r/[relevant subreddit]. Title + body. Lead with the problem, not the product. Sound like a real person. Max 200 words.",
  producthunt: "Write a Product Hunt first comment (the founder's intro comment). Personal story, what problem it solves, invite feedback. Max 150 words.",
  hn: "Write a Show HN post. Format: 'Show HN: [Product] – [tagline]' then a brief description. HN tone: humble, technical, honest. Max 100 words.",
  twitter: "Write a tweet thread (3 tweets). Tweet 1: hook/problem. Tweet 2: solution. Tweet 3: CTA with link. Each tweet max 280 chars.",
  newsletter: "Write a 2-sentence product pitch for a newsletter. Clear problem, clear solution, one CTA.",
  investor: "Based on the task context, write the appropriate investor-related content. Use the task description to determine the format: cold email (subject + 5 sentences max), warm intro request (3 sentences), accelerator application answer (2 short paragraphs), or public traction post (2-3 sentences). Be specific, data-driven where possible, and compelling. Max 200 words.",
};

export async function POST(req: Request) {
  const { taskId, taskTitle, platform, productName, oneLiner } = await req.json() as {
    taskId: string;
    taskTitle: string;
    platform: string;
    productName: string;
    oneLiner: string;
  };

  void taskId;

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl) {
    return new Response(`data: ${JSON.stringify("ERR:NO_OLLAMA_URL")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const instruction = PLATFORM_INSTRUCTIONS[platform] ?? "Write a short launch announcement for this product. Max 150 words.";

  const prompt = `Product: "${productName}"
Description: "${oneLiner}"
Task context: "${taskTitle}"

${instruction}`;

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
        options: { temperature: 0.4, num_predict: 2048 },
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify("ERR:STREAM_CATCH:" + String(streamErr))}\n\n`));
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
