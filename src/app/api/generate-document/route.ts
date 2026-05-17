export const runtime = 'edge';
export const maxDuration = 60;

const DOC_PROMPTS: Record<string, string> = {
  "privacy-policy": `Write a comprehensive, plain-language Privacy Policy. Include sections: 1) What information we collect, 2) How we use your information, 3) Cookies and tracking, 4) Third-party services, 5) Data retention, 6) Your rights (including GDPR/CCPA where applicable), 7) Security, 8) Changes to this policy, 9) Contact us. Be specific to the product described.`,
  "terms-of-service": `Write comprehensive, plain-language Terms of Service. Include sections: 1) Acceptance of terms, 2) Description of service, 3) User accounts and responsibilities, 4) Prohibited uses, 5) Intellectual property, 6) Payment and refunds (if applicable), 7) Disclaimers and limitation of liability, 8) Termination, 9) Governing law, 10) Contact us. Be specific to the product described.`,
  "cookie-policy": `Write a clear, plain-language Cookie Policy. Include sections: 1) What are cookies, 2) How we use cookies, 3) Types of cookies we use (essential, functional, analytics, marketing), 4) Third-party cookies, 5) Managing your cookie preferences, 6) Updates to this policy, 7) Contact us. Be specific to the product described.`,
};

export async function POST(req: Request) {
  const { docType, productName, oneLiner, websiteUrl, targetUser } = await req.json() as {
    docType: "privacy-policy" | "terms-of-service" | "cookie-policy";
    productName: string;
    oneLiner: string;
    websiteUrl: string;
    targetUser: string;
  };

  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL ?? "gemma4:26b";

  if (!ollamaUrl) {
    return new Response(`data: ${JSON.stringify("ERR:NO_OLLAMA_URL")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const docInstruction = DOC_PROMPTS[docType] ?? DOC_PROMPTS["privacy-policy"];
  const docTitle = docType === "privacy-policy" ? "Privacy Policy" : docType === "terms-of-service" ? "Terms of Service" : "Cookie Policy";

  const prompt = `You are a legal document writer for tech startups. Write a complete, well-structured ${docTitle} document.

Product name: ${productName}
Description: ${oneLiner}
Website: ${websiteUrl || "Not provided"}
Target users: ${targetUser || "General public"}
Effective date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${docInstruction}

Start with "# ${docTitle}" then "**${productName}**" then "**Effective Date:** [date]". Use proper markdown formatting with ## for sections and ### for subsections. Write in plain, clear English that a non-lawyer can understand. Be thorough but concise.

End with:

---
*This document was AI-generated for informational purposes. Review with a qualified attorney before use.*`;

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
