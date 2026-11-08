import "server-only";

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

export async function ollamaStatus(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const { models = [] } = (await res.json()) as { models?: { name: string }[] };
    if (models.some((m) => m.name === OLLAMA_MODEL)) return { ok: true, message: `Running (${OLLAMA_MODEL})` };
    return { ok: false, message: `Model ${OLLAMA_MODEL} not installed. Run: ollama pull ${OLLAMA_MODEL}` };
  } catch {
    return { ok: false, message: "Ollama is not running. Open the Ollama app from the Start menu." };
  }
}

/** Ask the local model for a reply that matches a JSON schema. */
export async function ollamaJson<T>(system: string, user: string, schema: object, timeoutMs = 180_000): Promise<T> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: schema,
      options: { temperature: 0, num_ctx: 8192 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
  const body = (await res.json()) as { message?: { content?: string } };
  return JSON.parse(body.message?.content ?? "{}") as T;
}
