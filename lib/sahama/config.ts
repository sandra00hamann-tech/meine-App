// Sahama's switches, read from config/sahama.json — the one place that file is
// read in the app (lib/ai/disclosure.mjs reads it for the AI notice, in .mjs,
// for legal-check). Fail-closed: anything malformed counts as off / default.

import raw from "@/config/sahama.json";

export interface SahamaConfig {
  checkinReplies: boolean;
  /** Personal replies per Berlin week for a member without the plan. */
  freeRepliesPerWeek: number;
  adviceUrl: string | null;
  /** The operator's Ayurveda site — the pointer under every article. */
  moreInfoUrl: string | null;
}

export function parseSahamaConfig(value: unknown): SahamaConfig {
  const v = (value ?? {}) as Record<string, unknown>;
  const free = v.freeRepliesPerWeek;
  const url = v.adviceUrl;
  const more = v.moreInfoUrl;
  return {
    checkinReplies: v.checkinReplies === true,
    freeRepliesPerWeek:
      typeof free === "number" &&
      Number.isInteger(free) &&
      free >= 0 &&
      free <= 50
        ? free
        : 0,
    adviceUrl:
      typeof url === "string" && /^https:\/\/\S+$/.test(url) ? url : null,
    moreInfoUrl:
      typeof more === "string" && /^https:\/\/\S+$/.test(more) ? more : null,
  };
}

export function sahamaConfig(): SahamaConfig {
  return parseSahamaConfig(raw);
}
