export const runtime = 'edge';
export const maxDuration = 60;

const DOC_PROMPTS: Record<string, (args: { productName: string; oneLiner: string; websiteUrl: string; targetUser: string }) => string> = {
  'privacy-policy': ({ productName, oneLiner, websiteUrl, targetUser }) => `Write a clear, plain-language Privacy Policy for the following product.

Product: "${productName}"
Description: "${oneLiner}"
Website: "${websiteUrl || 'Not provided'}"
Target users: "${targetUser || 'general consumers'}"

Write a complete Privacy Policy document. Use plain English — avoid dense legal jargon. Include sections: Introduction, Information We Collect, How We Use Your Information, Information Sharing, Data Retention, Security, User Rights, Cookies, Children's Privacy, Changes to This Policy, Contact Us.

Format as a clean document with numbered sections and clear headings. Be specific to this product type and target user.`,

  'terms-of-service': ({ productName, oneLiner, websiteUrl, targetUser }) => `Write plain-language Terms of Service for the following product.

Product: "${productName}"
Description: "${oneLiner}"
Website: "${websiteUrl || 'Not provided'}"
Target users: "${targetUser || 'general consumers'}"

Write a complete Terms of Service document. Use plain English. Include sections: Agreement to Terms, Use of Service, User Accounts, Prohibited Uses, Intellectual Property, Disclaimers, Limitation of Liability, Termination, Governing Law, Changes to Terms, Contact.

Format as a clean document with numbered sections and clear headings. Be specific to this product type.`,

  'cookie-policy': ({ productName, oneLiner, websiteUrl, targetUser }) => `Write a plain-language Cookie Policy for the following product.

Product: "${productName}"
Description: "${oneLiner}"
Website: "${websiteUrl || 'Not provided'}"
Target users: "${targetUser || 'general consumers'}"

Write a complete Cookie Policy document. Use plain English. Include sections: What Are Cookies, How We Use Cookies, Types of Cookies We Use (essential, analytics, marketing), Third-Party Cookies, Managing Your Cookie Preferences, Updates to This Policy, Contact.

Format as a clean document with numbered sections and clear headings.`,
};

export async function POST(req: Request) {
  const { docType, productName, oneLiner, websiteUrl, targetUser } = await req.json() as {
    docType: 'privacy-policy' | 'terms-of-service' | 'cookie-policy';
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

  const buildPrompt = DOC_PROMPTS[docType];
  if (!buildPrompt) {
    return new Response(`data: ${JSON.stringify("ERR:INVALID_DOC_TYPE")}\n\ndata: [DONE]\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const prompt = buildPrompt({ productName, oneLiner, websiteUrl, targetUser });

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
