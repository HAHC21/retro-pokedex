import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";

function readChangelogVersion(): string {
  const source = readFileSync(`${process.cwd()}/src/changelog.ts`, "utf8");
  const match = source.match(/export const CHANGELOG[\s\S]*?\bversion:\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error("The newest changelog release needs a string version.");
  }
  return match[1];
}

let shippedVersion: string | undefined;

function shippedFrontendVersion(command: "build" | "serve"): string {
  if (shippedVersion) {
    return shippedVersion;
  }
  const override = process.env.VITE_APP_VERSION?.trim();
  const release = override || readChangelogVersion();
  shippedVersion = command === "build" && !override ? `${release}.${Date.now().toString(36)}` : release;
  return shippedVersion;
}

function versionJsonPlugin(version: string): Plugin {
  const body = JSON.stringify({ version });
  const serve: Plugin["configureServer"] = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0];
      if (url !== "/version.json") {
        next();
        return;
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
    });
  };

  return {
    name: "version-json",
    configureServer: serve,
    configurePreviewServer: serve,
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: body,
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const version = shippedFrontendVersion(command);
  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [react(), versionJsonPlugin(version)],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
