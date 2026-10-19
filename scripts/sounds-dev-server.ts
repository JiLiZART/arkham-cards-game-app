/**
 * The dev-only half of the sound picker (ADR-0010): serves the untracked candidate previews, lists the candidates, and
 * records a choice by rewriting content/sounds/sounds.json and running the importer for the new clip. Only while
 * `vite` serves (vite.config.ts mounts it in configureServer, never in a build), only for requests from this machine.
 */
import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, normalize } from "node:path";
import { z } from "zod";
import { SoundCandidates, SoundManifest } from "../src/content/schema";
import { type Choice, chooseSound } from "../src/content/soundChoose";

const MANIFEST = "content/sounds/sounds.json";
const CANDIDATES = "content/sounds/candidates.json";
const PREFIX = "/__sounds-src/";
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** a request from this machine, for localhost by name (not a rebinding of another name to 127.0.0.1), from this page */
export function isLocalRequest(host: string | undefined, remote: string | undefined, origin?: string): boolean {
  if (!host || !remote || !LOOPBACK.has(remote)) return false;
  const name = (h: string) => h.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  const local = (h: string) => ["localhost", "127.0.0.1", "::1"].includes(name(h));
  if (!local(host)) return false;
  return origin === undefined || (/^https?:\/\//.test(origin) && local(origin.replace(/^https?:\/\//, "")) && origin.endsWith(host));
}

/** the file a /__sounds-src/ request names, inside sounds-src/candidates; null for anything else */
export function candidateFile(url: string): string | null {
  const path = url.split("?")[0];
  if (!path.startsWith(PREFIX)) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(path.slice(PREFIX.length));
  } catch {
    return null;
  }
  const clean = normalize(rel);
  if (!rel || rel.startsWith("/") || clean.startsWith("..") || clean.includes("../")) return null;
  return `sounds-src/candidates/${clean}`;
}

const ChoiceBody = z.object({ slot: z.string().min(1), candidate: z.union([z.number().int().min(0), z.literal("none"), z.literal("current")]) }).strict();
export function parseChoice(body: string): Choice {
  return ChoiceBody.parse(JSON.parse(body));
}

const TYPES: Record<string, string> = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav" };

function readBody(req: IncomingMessage, limit = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (d) => {
      body += d;
      if (body.length > limit) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** the connect middleware vite.config.ts mounts while serving; `next` is called for every other URL */
export async function soundsDevMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  const url = req.url ?? "";
  if (!url.startsWith(PREFIX) && !url.startsWith("/__sounds/")) return next();
  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  if (!isLocalRequest(req.headers.host, req.socket.remoteAddress, req.headers.origin)) return send(403, { error: "dev tooling answers this machine only" });
  try {
    if (req.method === "GET" && url.startsWith(PREFIX)) {
      const file = candidateFile(url);
      if (!file || !existsSync(file) || !statSync(file).isFile()) return send(404, { error: "no such candidate" });
      res.setHeader("Content-Type", TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
      res.setHeader("Cache-Control", "no-cache");
      return void createReadStream(file).pipe(res);
    }
    if (req.method === "GET" && url === "/__sounds/candidates") return send(200, SoundCandidates.parse(JSON.parse(readFileSync(CANDIDATES, "utf8"))));
    if (req.method === "POST" && url === "/__sounds/choose") {
      const before = readFileSync(MANIFEST, "utf8");
      const chosen = chooseSound(SoundManifest.parse(JSON.parse(before)), SoundCandidates.parse(JSON.parse(readFileSync(CANDIDATES, "utf8"))), parseChoice(await readBody(req)));
      // the schema fills in gain 1 everywhere; the file keeps only gains that differ
      writeFileSync(MANIFEST, `${JSON.stringify(chosen.manifest, (k, v) => (k === "gain" && v === 1 ? undefined : v), 2)}\n`);
      try {
        if (chosen.importIds.length) execFileSync("npx", ["tsx", "scripts/import-sounds.ts", ...chosen.importIds], { stdio: "pipe" });
      } catch (e) {
        writeFileSync(MANIFEST, before);
        throw new Error(`the importer failed, the choice is undone: ${(e as { stderr?: Buffer }).stderr?.toString() ?? e}`);
      }
      for (const f of chosen.removedFiles) if (existsSync(`public/sounds/${f}`)) unlinkSync(`public/sounds/${f}`);
      return send(200, { manifest: chosen.manifest, imported: chosen.importIds });
    }
    return send(404, { error: "unknown dev route" });
  } catch (e) {
    return send(400, { error: e instanceof Error ? e.message : String(e) });
  }
}
