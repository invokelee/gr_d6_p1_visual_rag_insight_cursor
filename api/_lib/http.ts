import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { ZodError, type ZodSchema } from "zod";

export type Req = IncomingMessage & { body?: unknown };
export type Res = ServerResponse;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export async function readRawBody(req: Req): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer | string) =>
      chunks.push(typeof c === "string" ? Buffer.from(c) : c),
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readJson<T>(req: Req, schema?: ZodSchema<T>): Promise<T> {
  let parsed: unknown;
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    parsed = req.body;
  } else {
    const buf = await readRawBody(req);
    if (buf.length === 0) parsed = {};
    else parsed = JSON.parse(buf.toString("utf8"));
  }
  if (schema) return schema.parse(parsed);
  return parsed as T;
}

export function sendJson(res: Res, status: number, payload: unknown) {
  if (!res.headersSent) {
    res.statusCode = status;
    Object.entries(JSON_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  }
  res.end(JSON.stringify(payload));
}

export function sendError(res: Res, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  sendJson(res, status, { error: code, message, ...extra });
}

export function methodGuard(req: Req, res: Res, methods: string[]): boolean {
  const m = (req.method ?? "GET").toUpperCase();
  if (!methods.includes(m)) {
    res.setHeader("allow", methods.join(", "));
    sendError(res, 405, "method_not_allowed", `${m} not allowed`);
    return false;
  }
  return true;
}

export function withRequestId(): string {
  return randomUUID();
}

export function handleZodError(res: Res, err: unknown): boolean {
  if (err instanceof ZodError) {
    sendError(res, 400, "validation_error", "Invalid request payload", {
      issues: err.issues,
    });
    return true;
  }
  return false;
}

/** Minimal multipart/form-data parser supporting one file field + scalar fields. */
export async function readMultipart(req: Req): Promise<{
  file?: { fieldName: string; filename: string; contentType: string; data: Buffer };
  fields: Record<string, string>;
}> {
  const ctype = (req.headers["content-type"] ?? "").toString();
  const m = /boundary=("?)([^";]+)\1/.exec(ctype);
  if (!m) throw new Error("Missing multipart boundary");
  const boundary = `--${m[2]}`;
  const buf = await readRawBody(req);
  const parts = splitBuffer(buf, Buffer.from(boundary));
  const fields: Record<string, string> = {};
  let file: { fieldName: string; filename: string; contentType: string; data: Buffer } | undefined;

  for (const part of parts) {
    if (part.length === 0) continue;
    const headerEnd = indexOfSeq(part, Buffer.from("\r\n\r\n"));
    if (headerEnd < 0) continue;
    const headerStr = part.slice(0, headerEnd).toString("utf8");
    let body = part.slice(headerEnd + 4);
    if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
      body = body.slice(0, body.length - 2);
    }
    const dispMatch = /content-disposition: form-data; name="([^"]+)"(?:; filename="([^"]*)")?/i.exec(headerStr);
    if (!dispMatch) continue;
    const fieldName = dispMatch[1]!;
    const filename = dispMatch[2];
    if (filename) {
      const ctMatch = /content-type:\s*([^\r\n]+)/i.exec(headerStr);
      file = {
        fieldName,
        filename,
        contentType: (ctMatch?.[1] ?? "application/octet-stream").trim(),
        data: body,
      };
    } else {
      fields[fieldName] = body.toString("utf8");
    }
  }
  return { file, fields };
}

function indexOfSeq(buf: Buffer, seq: Buffer, from = 0): number {
  outer: for (let i = from; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let idx = indexOfSeq(buf, sep);
  while (idx >= 0) {
    parts.push(buf.slice(start, idx));
    start = idx + sep.length;
    if (buf.slice(start, start + 2).toString() === "\r\n") start += 2;
    idx = indexOfSeq(buf, sep, start);
  }
  parts.push(buf.slice(start));
  return parts;
}
