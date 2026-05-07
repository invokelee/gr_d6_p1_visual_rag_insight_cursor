import OpenAI from "openai";
import { readEnv } from "./env.js";

let cachedClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cachedClient) return cachedClient;
  const env = readEnv();
  if (!env.openaiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local or your Vercel project env.",
    );
  }
  cachedClient = new OpenAI({ apiKey: env.openaiKey });
  return cachedClient;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const env = readEnv();
  const client = getOpenAI();
  const resp = await client.embeddings.create({
    model: env.embeddingModel,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

export async function chatAnswer(opts: {
  question: string;
  contextChunks: { content: string; index: number; similarity: number }[];
}): Promise<string> {
  const env = readEnv();
  const client = getOpenAI();
  const context = opts.contextChunks
    .map(
      (c) =>
        `[chunk #${c.index} sim=${c.similarity.toFixed(3)}]\n${c.content}`,
    )
    .join("\n\n");
  const sys =
    "You are a precise RAG assistant. Answer ONLY using the provided context chunks. " +
    "If the answer is not in the context, say so plainly. Cite chunk indices like [#3] inline. " +
    "Respond in the language of the user's question.";
  const resp = await client.chat.completions.create({
    model: env.chatModel,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${opts.question}`,
      },
    ],
  });
  return resp.choices[0]?.message.content?.trim() ?? "";
}

export async function visionExtract(opts: {
  imageBase64: string;
  contentType: string;
}): Promise<string> {
  const env = readEnv();
  const client = getOpenAI();
  const resp = await client.chat.completions.create({
    model: env.chatModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract ALL legible text from the image, preserving layout (tables, lists). " +
          "Return plain text. Do not invent content.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this image." },
          {
            type: "image_url",
            image_url: {
              url: `data:${opts.contentType};base64,${opts.imageBase64}`,
            },
          },
        ],
      },
    ],
  });
  return resp.choices[0]?.message.content?.trim() ?? "";
}
