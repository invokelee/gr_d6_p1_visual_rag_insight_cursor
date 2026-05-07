/**
 * Centralized server-side environment access. Never imported from client code.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

// Load server env files for local/dev execution.
dotenv.config({ path: path.join(projectRoot, ".env.local"), override: false });
dotenv.config({ path: path.join(projectRoot, ".env"), override: false });

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
