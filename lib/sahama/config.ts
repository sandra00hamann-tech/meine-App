// Sahama's switches, read from config/sahama.json — the one place that file is
// read in the app (lib/ai/disclosure.mjs reads it for the AI notice, in .mjs,
// for legal-check). Fail-closed: anything malformed counts as off / default.

import raw from "@/config/sahama.json";

export interface SahamaConfig {
  checkinReplies: boolean;
  freeReplies: number;
  adviceUrl: string | null;
}

export function parseSahamaConfig(value: unknown): SahamaConfig {
  const v = (value ?? {}) as Record<string, unknown>;
  const free = v.freeReplies;
  const url = v.adviceUrl;
  return {
    checkinReplies: v.checkinReplies === true,
    freeReplies: typeof free === "number" && Number.isInteger(free) && free >= 0 && free <= 50 ? free : 0,
    adviceUrl: typeof url === "string" && /^https:\/\/\S+$/.test(url) ? url : null,
  };
}

export function sahamaConfig(): SahamaConfig {
  return parseSahamaConfig(raw);
}
