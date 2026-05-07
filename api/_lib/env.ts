/**
 * Centralized server-side environment access. Never imported from client code.
 */
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Load env files for local/dev execution.
// In Vercel, environment variables are injected by the platform.
const cwd = process.cwd();
const envLocalPath = path.join(cwd, ".env.local");
const envPath = path.join(cwd, ".env");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

export type AppEnv = {
  openaiKey: string | null;
  supabaseUrl: string | null;
  supabaseServiceKey: string | null;
  embeddingModel: string;
  chatModel: string;
};

export function readEnv(): AppEnv {
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  return {
    openaiKey: openaiKey ? openaiKey : null,
    supabaseUrl: supabaseUrl ? supabaseUrl : null,
    supabaseServiceKey: supabaseServiceKey ? supabaseServiceKey : null,
    embeddingModel: (process.env.EMBEDDING_MODEL ?? "text-embedding-3-small").trim(),
    chatModel: (process.env.CHAT_MODEL ?? "gpt-4o").trim(),
  };
}

export function modelVersions(env: AppEnv = readEnv()) {
  return {
    chat: env.chatModel,
    embedding: env.embeddingModel,
    vector_store: env.supabaseUrl ? "supabase-pgvector" : "in-memory",
  };
}
