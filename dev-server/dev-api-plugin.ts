import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Handler = (req: IncomingMessage, res: ServerResponse) => unknown | Promise<unknown>;

/**
 * Dev plugin that maps /api/<route> requests to api/<route>.ts handlers,
 * mirroring Vercel Serverless Function behavior closely enough for local
 * iteration. Use `vercel dev` for full fidelity.
 */
export function devApiPlugin(): Plugin {
  return {
    name: "vrip-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        const routePath = url.split("?")[0]!.replace(/^\/api\//, "");
        const cleanRoute = routePath.replace(/\/+$/, "");
        if (!cleanRoute || cleanRoute.includes("..")) return next();

        const apiRoot = path.resolve(server.config.root, "api");
        const candidates = [
          path.join(apiRoot, `${cleanRoute}.ts`),
          path.join(apiRoot, cleanRoute, "index.ts"),
        ];
        const filePath = candidates.find((p) => existsSync(p));
        if (!filePath) return next();

        try {
          const module = (await server.ssrLoadModule(filePath)) as {
            default?: Handler;
          };
          const handler = module.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end(`Module ${filePath} has no default export handler.`);
            return;
          }
          await handler(req, res);
        } catch (error) {
          console.error("[dev-api-plugin] handler error:", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(
              JSON.stringify({
                error: "internal_error",
                message: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        }
      });
    },
  };
}

// Allow running this file directly (just a sanity export).
export const __DEV_API_ENTRY__ = pathToFileURL(import.meta.url).href;
