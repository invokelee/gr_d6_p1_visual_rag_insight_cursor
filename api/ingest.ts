import { randomUUID } from "node:crypto";
import { modelVersions } from "./_lib/env.js";
import {
  handleZodError,
  methodGuard,
  readMultipart,
  sendError,
  sendJson,
  withRequestId,
  type Req,
  type Res,
} from "./_lib/http.js";
import { estimateTokens } from "./_lib/chunker.js";

const MAX_BYTES = 10 * 1024 * 1024;

export default async function handler(req: Req, res: Res) {
  if (!methodGuard(req, res, ["POST"])) return;
  const requestId = withRequestId();
  try {
    const { file, fields } = await readMultipart(req);
    if (!file) return sendError(res, 400, "missing_file", "form-data field 'file' is required");
    if (file.data.length === 0) return sendError(res, 400, "empty_file", "uploaded file is empty");
    if (file.data.length > MAX_BYTES) {
      return sendError(res, 413, "file_too_large", `max ${MAX_BYTES} bytes`);
    }

    const documentId = (fields.documentId ?? "").trim() || `doc_${randomUUID()}`;
    const ctype = file.contentType.toLowerCase();
    let text = "";
    let kind: "pdf" | "image" | "text" = "text";

    if (ctype.includes("pdf") || file.filename.toLowerCase().endsWith(".pdf")) {
      kind = "pdf";
      const pdfModule = await import("pdf-parse");
      const pdfParse = (pdfModule.default ?? pdfModule) as (b: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(file.data);
      text = parsed.text ?? "";
    } else if (ctype.startsWith("image/")) {
      kind = "image";
      const base64 = file.data.toString("base64");
      const { visionExtract } = await import("./_lib/openai.js");
      text = await visionExtract({ imageBase64: base64, contentType: ctype });
    } else if (
      ctype.startsWith("text/") ||
      ctype.includes("json") ||
      ctype.includes("markdown") ||
      ctype === "application/octet-stream"
    ) {
      kind = "text";
      text = file.data.toString("utf8");
    } else {
      return sendError(res, 415, "unsupported_media_type", `Unsupported content-type: ${ctype}`);
    }

    text = text.replace(/\u0000/g, "").trim();
    if (!text) {
      return sendError(res, 422, "no_text_extracted", "No usable text was extracted from the file");
    }

    sendJson(res, 200, {
      request_id: requestId,
      model_versions: modelVersions(),
      documentId,
      kind,
      filename: file.filename,
      bytes: file.data.length,
      tokens: estimateTokens(text),
      rawText: text,
    });
  } catch (err) {
    if (handleZodError(res, err)) return;
    console.error("[api/ingest]", err);
    sendError(res, 500, "ingest_failed", err instanceof Error ? err.message : String(err));
  }
}
