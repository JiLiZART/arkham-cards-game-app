/**
 * Import Russian card images from inspired/CARDS_ru (community cards, preferred) and the card images embedded in
 * inspired/PDF_ru (print sheets, fallback). Stages, each cached under .cache/ru-import and skipped when done:
 *   1. extract  — the PDFs' embedded card images (pdfimages), Russian Tesseract data
 *   2. ocr      — title and full-card text of every candidate image
 *   3. match    — score each image against the content's cards (see ruMatch.ts)
 *   4. choose   — per code and side: the best CARDS_ru image, else the best PDF image; review overrides on top
 *   5. review   — .cache/ru-import/review.html for uncertain picks
 *   6. output   — content/i18n/ru/images.json, public/cards-ru/*.webp (content cards, 50%), src/ui/ruImages.generated.json
 * Needs tesseract, pdfimages (poppler), ImageMagick and cwebp.   npm run import:ru-cards [-- --stage ocr]
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { promisify } from "node:util";
import { loadContentFromDisk } from "../src/content/node";
import type { ContentDb } from "../src/engine/types";
import { draftName, draftText, type PrintDraft } from "./ruText";
import { accepted, ACCEPT, norm, rank, type CardInfo, type ImageInfo, type Score, type Side } from "./ruMatch";

const run = promisify(execFile);
const ROOT = process.cwd();
const CARDS_DIR = "inspired/CARDS_ru";
const PDF_DIR = "inspired/PDF_ru";
const CACHE = ".cache/ru-import";
const TESSDATA = ".cache/tessdata";
const PARALLEL = 8;

export interface Candidate {
  /** path relative to the repo root */
  file: string;
  source: "cards" | "pdf";
  w: number;
  h: number;
}

export interface Ocr {
  title: string;
  text: string;
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

/** a tiny parallel map */
async function pool<T, R>(items: T[], n: number, fn: (t: T, k: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const k = next++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

// ---------- 1. extract ----------
async function tessdata() {
  mkdirSync(TESSDATA, { recursive: true });
  for (const lang of ["rus", "eng"]) {
    const f = join(TESSDATA, `${lang}.traineddata`);
    if (existsSync(f)) continue;
    const res = await fetch(`https://github.com/tesseract-ocr/tessdata_best/raw/main/${lang}.traineddata`);
    if (!res.ok) throw new Error(`tessdata ${lang}: HTTP ${res.status}`);
    writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    console.log(`downloaded ${f}`);
  }
}

async function extractPdfs() {
  for (const pdf of readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"))) {
    const out = join(CACHE, "pdf", basename(pdf, ".pdf"));
    if (existsSync(out) && readdirSync(out).length) continue;
    mkdirSync(out, { recursive: true });
    // -j keeps JPEGs as they are, -p puts the page number in the name
    await run("pdfimages", ["-j", "-p", join(PDF_DIR, pdf), join(out, "img")]);
    console.log(`extracted ${pdf}: ${readdirSync(out).length} images`);
  }
}

async function size(file: string): Promise<{ w: number; h: number }> {
  const { stdout } = await run("magick", ["identify", "-format", "%w %h\n", `${file}[0]`]);
  const [w, h] = stdout.trim().split("\n")[0].split(" ").map(Number);
  return { w, h };
}

/** every image that may be a card: CARDS_ru (not the card backs) and the PDFs' card-sized images */
async function candidates(): Promise<Candidate[]> {
  const cache = join(CACHE, "candidates.json");
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const img = (f: string) => /\.(jpe?g|png|ppm)$/i.test(f);
  const files = [
    ...walk(CARDS_DIR).filter((f) => img(f) && !f.includes("/Рубашки/")).map((file) => ({ file, source: "cards" as const })),
    ...walk(join(CACHE, "pdf")).filter(img).map((file) => ({ file, source: "pdf" as const })),
  ];
  const sized = await pool(files, PARALLEL, async (c) => ({ ...c, ...(await size(c.file)) }));
  // portrait card scans are ~756×1063; smaller images on the sheets are investigator portraits and decorations
  const out = sized.filter((c) => Math.max(c.w, c.h) >= 900 && Math.min(c.w, c.h) >= 600).map((c) => ({ ...c, file: relative(ROOT, join(ROOT, c.file)) }));
  writeFileSync(cache, JSON.stringify(out, null, 1));
  return out;
}

// ---------- 2. ocr ----------
const keyOf = (c: Candidate) => createHash("sha1").update(`${c.file}:${statSync(c.file).size}`).digest("hex").slice(0, 16);

async function tesseract(image: string, psm: number): Promise<string> {
  const { stdout } = await run("tesseract", [image, "stdout", "-l", "rus+eng", "--psm", String(psm)], {
    env: { ...process.env, TESSDATA_PREFIX: join(ROOT, TESSDATA), OMP_THREAD_LIMIT: "1" },
    maxBuffer: 1 << 24,
  });
  return stdout.replace(/\f/g, "").trim();
}

/** title band and the whole card, OCR'd; cached per file */
export async function ocrOf(c: Candidate): Promise<Ocr> {
  const dir = join(CACHE, "ocr");
  mkdirSync(dir, { recursive: true });
  const cache = join(dir, `${keyOf(c)}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const tmp = join(dir, `${keyOf(c)}-title.png`);
  const body = join(dir, `${keyOf(c)}-body.png`);
  const portrait = c.h >= c.w;
  // the name sits in a band across the top of portrait cards; acts and agendas print it top-left
  const crop = portrait
    ? `${Math.round(c.w * 0.7)}x${Math.round(c.h * 0.08)}+${Math.round(c.w * 0.15)}+${Math.round(c.h * 0.008)}`
    : `${Math.round(c.w * 0.55)}x${Math.round(c.h * 0.13)}+${Math.round(c.w * 0.02)}+${Math.round(c.h * 0.02)}`;
  await run("magick", [`${c.file}[0]`, "-crop", crop, "+repage", "-resize", "300%", "-colorspace", "Gray", "-normalize", tmp]);
  // rules text: the lower half of a portrait card (the art above only adds noise); the whole of a landscape one
  await run("magick", [`${c.file}[0]`, ...(portrait ? ["-gravity", "South", "-crop", "100%x48%+0+0", "+repage"] : []), "-colorspace", "Gray", "-normalize", body]);
  const title = await tesseract(tmp, 7);
  const text = await tesseract(body, portrait ? 6 : 3);
  rmSync(tmp);
  rmSync(body);
  const out: Ocr = { title, text };
  writeFileSync(cache, JSON.stringify(out));
  return out;
}

// ---------- 3–6. match, choose, review, output ----------
const MANIFEST = "content/i18n/ru/images.json";
const OVERRIDES = "content/i18n/ru/images.overrides.json";
const OUT_DIR = "public/cards-ru";
const GENERATED = "src/ui/ruImages.generated.json";

/** what the matcher knows about each content card */
function cardInfos(db: ContentDb): CardInfo[] {
  const ru = db.i18n.ru?.cards ?? {};
  return Object.values(db.cards).map((d) => {
    const tr = ru[d.code] ?? {};
    const sideText = (t?: string) => (t ? t.replace(/<[^>]+>|\[\[|\]\]|\[\w+\]/g, " ") : undefined);
    const landscape = d.type === "act" || d.type === "agenda";
    return {
      code: d.code,
      type: d.type,
      landscape: { front: landscape || d.type === "investigator", back: landscape },
      doubleSided: !!d.doubleSided,
      names: [tr.name, tr.backName].filter((n): n is string => !!n),
      text: { front: sideText([tr.traits?.join(". "), tr.text].filter(Boolean).join("\n") || undefined), back: sideText(tr.backText) },
      enLength: { front: norm(d.text ?? "").length, back: norm(d.backText ?? "").length },
    };
  });
}

export interface Pick {
  src: string;
  source: "cards" | "pdf";
  score: number;
  /** pinned by a review override */
  pinned?: boolean;
}
export type Manifest = Record<string, Partial<Record<Side, Pick>>>;

/** per code and side: the best accepted CARDS_ru image, else the best accepted PDF image; overrides on top */
export function choose(ranked: { img: ImageInfo; scores: Score[] }[], overrides: Record<string, string | null>, sourceOf: (file: string) => "cards" | "pdf"): Manifest {
  const out: Manifest = {};
  for (const { img, scores } of ranked) {
    const best = accepted(scores);
    if (!best) continue;
    const cur = out[best.code]?.[best.side];
    const better = !cur || (img.source === "cards" && cur.source === "pdf") || (img.source === cur.source && best.score > cur.score);
    if (better) (out[best.code] ??= {})[best.side] = { src: img.file, source: img.source, score: Math.round(best.score * 1000) / 1000 };
  }
  for (const [key, src] of Object.entries(overrides)) {
    // keys are "<code>:front" / "<code>:back"
    const [code, side = "front"] = key.split(":") as [string, Side?];
    if (src === null) delete out[code]?.[side];
    else (out[code] ??= {})[side] = { src, source: sourceOf(src), score: 1, pinned: true };
  }
  for (const k of Object.keys(out)) if (!out[k].front && !out[k].back) delete out[k];
  return out;
}

const outName = (code: string, side: Side) => `${code}${side === "back" ? "b" : ""}.webp`;

/** 50% WebP of a card image; always rewritten, so a changed pick never leaves a stale file behind */
async function convert(src: string, dest: string) {
  const { stdout } = await run("magick", ["identify", "-format", "%[colorspace]", `${src}[0]`]);
  // pdfimages -j writes the PDFs' CMYK JPEGs without the PDF's decode inversion: they come out as negatives
  const fix = stdout.trim() === "CMYK" ? ["-negate", "-colorspace", "sRGB"] : [];
  await run("magick", [`${src}[0]`, ...fix, "-resize", "50%", "-strip", "-quality", "82", dest]);
}

function reviewPage(db: ContentDb, cards: CardInfo[], manifest: Manifest, ranked: { img: ImageInfo; scores: Score[] }[]): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rel = (f: string) => relative(CACHE, f).split("\\").join("/");
  // the best images that were not accepted, by the card side they would have gone to
  const near = new Map<string, { img: ImageInfo; s: Score }[]>();
  for (const { img, scores } of ranked) {
    const s = scores[0];
    if (!s || s.score < 0.35) continue;
    const k = `${s.code}:${s.side}`;
    near.set(k, [...(near.get(k) ?? []), { img, s }].sort((a, b) => b.s.score - a.s.score).slice(0, 4));
  }
  const rows = cards.flatMap((c) =>
    (["front", "back"] as Side[])
      .filter((side) => side === "front" || c.doubleSided)
      .map((side) => {
        const pick = manifest[c.code]?.[side];
        const en = rel(join(".cache/cards", outName(c.code, side)));
        const cands = (near.get(`${c.code}:${side}`) ?? []).filter((n) => n.img.file !== pick?.src);
        const cls = pick ? (pick.pinned ? "pinned" : pick.score < ACCEPT + 0.1 ? "weak" : "ok") : "none";
        return `<tr class="${cls}"><td><b>${c.code}${side === "back" ? "b" : ""}</b><br>${esc(c.names[0] ?? db.cards[c.code].name)}<br><i>${c.type}</i>${pick ? `<br>${pick.score}${pick.pinned ? " (pinned)" : ""}` : "<br>— none —"}</td>
<td><img src="${en}"></td><td>${pick ? `<img src="${rel(pick.src)}"><br><small>${esc(pick.src)}</small>` : ""}</td>
<td>${cands.map((n) => `<figure><img src="${rel(n.img.file)}"><figcaption>${n.s.score.toFixed(2)} ${esc(n.img.file)}</figcaption></figure>`).join("")}</td></tr>`;
      }),
  );
  return `<!doctype html><meta charset="utf-8"><title>RU card review</title><style>
body{font:13px sans-serif;background:#222;color:#ddd} table{border-collapse:collapse} td{border:1px solid #444;padding:4px;vertical-align:top}
img{height:220px} figure{display:inline-block;margin:2px} figcaption{max-width:180px;font-size:11px;word-break:break-all}
tr.none td:first-child{background:#622} tr.weak td:first-child{background:#663} tr.pinned td:first-child{background:#235}
</style><p>red: no Russian image · yellow: weak match · blue: pinned by an override. Pin with content/i18n/ru/images.overrides.json: {"01111:back": "inspired/…/file.jpg"}, or null to reject.</p><table>${rows.join("\n")}</table>`;
}

async function matchAndOutput(cands: Candidate[]) {
  const { db } = await loadContentFromDisk();
  const cards = cardInfos(db);
  const imgs: ImageInfo[] = await pool(cands, PARALLEL, async (c) => ({ file: c.file, source: c.source, landscape: c.w > c.h, ...(await ocrOf(c)) }));
  const ranked = imgs.map((img) => ({ img, scores: rank(img, cards) }));
  // every image's best guesses, for reviewing cards that got no image
  writeFileSync(join(CACHE, "ranked.json"), JSON.stringify(ranked.filter((r) => r.scores[0]?.score >= 0.3).map((r) => ({ file: r.img.file, title: r.img.title, scores: r.scores.slice(0, 3) }))));
  const overrides: Record<string, string | null> = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, "utf8")) : {};
  const manifest = choose(ranked, overrides, (f) => (f.startsWith(CARDS_DIR) ? "cards" : "pdf"));
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 1) + "\n");
  writeFileSync(join(CACHE, "review.html"), reviewPage(db, cards, manifest, ranked));
  // outputs: 50% WebP for every chosen side, and the list the game reads
  mkdirSync(OUT_DIR, { recursive: true });
  const outputs: string[] = [];
  await pool(Object.entries(manifest).flatMap(([code, sides]) => Object.entries(sides).map(([side, p]) => ({ code, side: side as Side, p: p! }))), PARALLEL, async ({ code, side, p }) => {
    await convert(p.src, join(OUT_DIR, outName(code, side)));
    outputs.push(`${code}${side === "back" ? "b" : ""}`);
  });
  // stale outputs from earlier runs go away
  for (const f of readdirSync(OUT_DIR)) if (!outputs.includes(f.replace(/\.webp$/, ""))) rmSync(join(OUT_DIR, f));
  writeFileSync(GENERATED, JSON.stringify(outputs.sort(), null, 1) + "\n");
  // print-text drafts for the community cards (the PDFs are the official translation the game already has)
  const ocrByFile = new Map(imgs.map((i) => [i.file, i]));
  const drafts: Record<string, PrintDraft & { back?: { name?: string; text?: string; iconsUnsure?: boolean }; src: string }> = {};
  for (const [code, sides] of Object.entries(manifest)) {
    const d = db.cards[code];
    const tr = db.i18n.ru?.cards[code] ?? {};
    const front = sides.front?.source === "cards" ? ocrByFile.get(sides.front.src) : undefined;
    const back = sides.back?.source === "cards" ? ocrByFile.get(sides.back.src) : undefined;
    if (!front && !back) continue;
    const f = front ? draftText(front.text, tr.text ?? d.text ?? "") : null;
    const b = back ? draftText(back.text, tr.backText ?? d.backText ?? "") : null;
    drafts[code] = {
      src: (front ?? back)!.file,
      name: draftName(front?.title ?? back!.title, (front ?? back)!.file),
      ...(f ? { traits: f.traits, text: f.text, iconsUnsure: f.iconsUnsure } : {}),
      ...(b ? { back: { text: b.text, iconsUnsure: b.iconsUnsure } } : {}),
    };
  }
  writeFileSync(join(CACHE, "print-drafts.json"), JSON.stringify(drafts, null, 1));
  // report
  const sides = cards.flatMap((c) => (c.doubleSided ? [`${c.code}:front`, `${c.code}:back`] : [`${c.code}:front`]));
  const have = sides.filter((k) => { const [code, side] = k.split(":"); return manifest[code]?.[side as Side]; });
  const fromCards = Object.values(manifest).flatMap((m) => Object.values(m)).filter((p) => p!.source === "cards").length;
  const missing = sides.filter((k) => !have.includes(k));
  const byType: Record<string, number> = {};
  for (const k of missing) byType[db.cards[k.split(":")[0]].type] = (byType[db.cards[k.split(":")[0]].type] ?? 0) + 1;
  const bytes = readdirSync(OUT_DIR).reduce((n, f) => n + statSync(join(OUT_DIR, f)).size, 0);
  console.log(`card sides: ${have.length}/${sides.length} have a Russian image (${fromCards} from CARDS_ru, ${have.length - fromCards} from the PDFs); ${(bytes / 1e6).toFixed(1)} MB in ${OUT_DIR}`);
  console.log(`missing by type: ${JSON.stringify(byType)}`);
  console.log(`unmatched images: ${ranked.filter((r) => !accepted(r.scores)).length}; review: ${join(CACHE, "review.html")}`);
}

async function main() {
  const only = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : null;
  mkdirSync(CACHE, { recursive: true });
  await tessdata();
  await extractPdfs();
  const cands = await candidates();
  const by = (s: string) => cands.filter((c) => c.source === s).length;
  console.log(`candidates: ${by("cards")} CARDS_ru, ${by("pdf")} PDF`);
  if (only === "extract") return;
  let done = 0;
  const t0 = Date.now();
  await pool(cands, PARALLEL, async (c) => {
    await ocrOf(c);
    if (++done % 100 === 0) console.log(`ocr ${done}/${cands.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
  });
  console.log(`ocr done: ${cands.length}`);
  if (only === "ocr") return;
  await matchAndOutput(cands);
}

if (process.argv[1] && extname(process.argv[1]) && import.meta.url.endsWith(basename(process.argv[1]))) await main();
