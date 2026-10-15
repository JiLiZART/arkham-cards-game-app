import type { CardScript, ContentDb } from "../engine/types";
import { buildContent, type ContentError } from "./loader";

/** content bundled by Vite: every JSON and script under /content is picked up automatically */
// the Russian image import's manifest and review overrides are tooling data, not game content
const files = import.meta.glob(["/content/**/*.json", "!/content/i18n/*/images*.json"], { eager: true, import: "default" }) as Record<string, unknown>;
const scripts = import.meta.glob("/content/**/scripts/*.ts", { eager: true, import: "default" }) as Record<string, CardScript>;

const built = buildContent(files, scripts);

export const content: ContentDb = built.db;
export const contentErrors: ContentError[] = built.errors;
