export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { url, productName } = await req.json() as {
    url: string;
    productName?: string;
  };

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl) {
    return Response.json({ error: "No OLLAMA_URL configured" });
  }

  let siteContext = `URL: ${url}${productName ? `\nProduct name: ${productName}` : ""}`;

  if (url) {
    try {
      const siteResp = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "text/html" },
      });
      if (siteResp.ok) {
        const html = await siteResp.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
        siteContext += `\nPage content: ${text}`;
      }
    } catch {
      // Use just URL + productName as context if fetch fails
    }
  }

  const prompt = `You are a product analyst. Given this product info, reply with ONLY a JSON object: { oneLiner, productType, targetUser } where productType is one of [Chrome Extension, Web App, Mobile App, CLI / Dev Tool, Other] and targetUser is one of [Developers, Indie Founders, Small Businesses, Consumers, Other] and oneLiner is under 100 chars.

${siteContext}`;

  try {
    const ollamaResp = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ollamaApiKey ?? ""}`,
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        think: false,
        options: { temperature: 0.4, num_predict: 2048 },
      }),
      redirect: "follow",
    });

    if (!ollamaResp.ok) {
      return Response.json({ error: `Ollama error: ${ollamaResp.status}` });
    }

    const data = await ollamaResp.json() as { message?: { content?: string } };
    const content = data.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Could not parse AI response" });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e) });
  }
}
