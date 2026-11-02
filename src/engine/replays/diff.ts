/** where two recorded results part: what a failing replay reports instead of two large blobs */

const show = (v: unknown): string =>
  v === undefined
    ? "(missing)"
    : Array.isArray(v) && v.length === 0
      ? "[]"
      : v !== null && typeof v === "object" && Object.keys(v).length === 0 && !Array.isArray(v)
        ? "{}"
        : typeof v === "object" && v !== null
          ? JSON.stringify(v).slice(0, 80)
          : JSON.stringify(v);

const kind = (v: unknown) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

/** the first path at which two plain JSON values differ, as "path: was != now", or null when they are deep-equal */
export function firstDiff(was: unknown, now: unknown, path = ""): string | null {
  const at = (key: string | number) => (path ? `${path}.${key}` : String(key));
  if (kind(was) !== kind(now)) return `${path}: ${show(was)} != ${show(now)}`;
  if (Array.isArray(was) && Array.isArray(now)) {
    if (was.length !== now.length) return `${at("length")}: ${was.length} != ${now.length}`;
    for (let i = 0; i < was.length; i++) {
      const d = firstDiff(was[i], now[i], at(i));
      if (d) return d;
    }
    return null;
  }
  if (was !== null && typeof was === "object") {
    const a = was as Record<string, unknown>;
    const b = now as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      // a key holding undefined is absent in JSON, the form a recording is stored in
      if (a[key] === undefined && b[key] === undefined) continue;
      if (a[key] === undefined || b[key] === undefined)
        return `${at(key)}: ${show(a[key])} != ${show(b[key])}`;
      const d = firstDiff(a[key], b[key], at(key));
      if (d) return d;
    }
    return null;
  }
  return was === now ? null : `${path}: ${show(was)} != ${show(now)}`;
}

interface LoggedEvent {
  type: string;
  text: string;
}

const showEvent = (e: LoggedEvent | undefined) =>
  e ? `${e.type} ${JSON.stringify(e.text)}` : "(none)";

/** the first event at which two event logs differ (compared whole, shown by type and text), or null */
export function firstEventDiff(was: LoggedEvent[], now: LoggedEvent[]): string | null {
  for (let i = 0; i < Math.max(was.length, now.length); i++)
    if (firstDiff(was[i], now[i]) !== null)
      return `event ${i}: ${showEvent(was[i])} != ${showEvent(now[i])}`;
  return null;
}
