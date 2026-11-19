import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CONCERNS, DOSHAS, DOSHA_QUESTIONS, MINUTE_OPTIONS, TIMES_OF_DAY, type DoshaAnswers } from "./catalog";
import {
  SahamaError,
  chooseRitual,
  cleanConcerns,
  leadingDoshas,
  parseMinutes,
  scoreDosha,
  timeOfDayAt,
  type ChoiceInput,
  type RitualForChoice,
} from "./rules";
import { mayUseTier } from "./access";

function answersWith(counts: { vata: number; pitta: number; kapha: number }): DoshaAnswers {
  const list = [
    ...Array(counts.vata).fill("vata"),
    ...Array(counts.pitta).fill("pitta"),
    ...Array(counts.kapha).fill("kapha"),
  ];
  return Object.fromEntries(DOSHA_QUESTIONS.map((q, i) => [q, list[i]])) as DoshaAnswers;
}

describe("scoreDosha", () => {
  it("turns twelve answers into shares that sum to exactly 100", () => {
    for (const counts of [
      { vata: 12, pitta: 0, kapha: 0 },
      { vata: 5, pitta: 4, kapha: 3 },
      { vata: 4, pitta: 4, kapha: 4 },
      { vata: 7, pitta: 3, kapha: 2 },
      { vata: 1, pitta: 1, kapha: 10 },
    ]) {
      const s = scoreDosha(answersWith(counts));
      expect(s.vata + s.pitta + s.kapha).toBe(100);
    }
  });

  it("weights each answer the same", () => {
    expect(scoreDosha(answersWith({ vata: 6, pitta: 3, kapha: 3 }))).toEqual({ vata: 50, pitta: 25, kapha: 25 });
    expect(scoreDosha(answersWith({ vata: 12, pitta: 0, kapha: 0 }))).toEqual({ vata: 100, pitta: 0, kapha: 0 });
  });

  it("refuses half a test rather than presenting it as whole", () => {
    const partial = answersWith({ vata: 6, pitta: 3, kapha: 3 });
    delete partial.sleep;
    expect(() => scoreDosha(partial)).toThrow(SahamaError);
    expect(() => scoreDosha({ ...answersWith({ vata: 12, pitta: 0, kapha: 0 }), frame: "fire" as never })).toThrow(
      "sahamaDoshaIncomplete",
    );
  });
});

describe("leadingDoshas", () => {
  it("names one Dosha when it clearly leads", () => {
    expect(leadingDoshas({ vata: 58, pitta: 25, kapha: 17 })).toEqual(["vata"]);
  });
  it("names two when the second is within 15 points", () => {
    expect(leadingDoshas({ vata: 42, pitta: 33, kapha: 25 })).toEqual(["vata", "pitta"]);
  });
  it("breaks an exact tie in the fixed order Vata, Pitta, Kapha", () => {
    expect(leadingDoshas({ vata: 34, pitta: 33, kapha: 33 })[0]).toBe("vata");
    expect(leadingDoshas({ vata: 20, pitta: 40, kapha: 40 })).toEqual(["pitta", "kapha"]);
  });
});

describe("start answers", () => {
  it("keeps only known concerns, each once", () => {
    expect(cleanConcerns(["busy_mind", "busy_mind", "headache", 3, "no_break"])).toEqual(["busy_mind", "no_break"]);
  });
  it("accepts only 5, 10 or 20 minutes", () => {
    expect(parseMinutes("10")).toBe(10);
    expect(parseMinutes(20)).toBe(20);
    for (const bad of ["0", "7", "", null, "abc", 60]) expect(() => parseMinutes(bad)).toThrow("sahamaMinutesInvalid");
  });
});

describe("timeOfDayAt — her clock is Germany's", () => {
  it("maps the hour in Berlin, not the server's", () => {
    expect(timeOfDayAt(new Date("2026-11-19T06:30:00Z"))).toBe("morning"); // 07:30 Berlin
    expect(timeOfDayAt(new Date("2026-11-19T11:00:00Z"))).toBe("midday"); // 12:00
    expect(timeOfDayAt(new Date("2026-11-19T19:00:00Z"))).toBe("evening"); // 20:00
    expect(timeOfDayAt(new Date("2026-11-19T01:00:00Z"))).toBe("evening"); // 02:00 — night counts as evening
  });
});

const R = (over: Partial<RitualForChoice> & { slug: string }): RitualForChoice => ({
  minutes: 5,
  timeOfDay: "any",
  doshas: [],
  concerns: [],
  position: 0,
  allowed: true,
  ...over,
});

const base: Omit<ChoiceInput, "rituals"> = {
  minutes: 10,
  leading: ["vata"],
  concerns: [],
  timeOfDay: "evening",
  recent: [],
};

describe("chooseRitual", () => {
  it("never offers a ritual she may not open", () => {
    const rituals = [R({ slug: "plus-perfect", doshas: ["vata"], timeOfDay: "evening", allowed: false }), R({ slug: "free-plain" })];
    expect(chooseRitual({ ...base, rituals })).toBe("free-plain");
  });

  it("never offers a ritual longer than her minutes", () => {
    const rituals = [R({ slug: "long", minutes: 20, doshas: ["vata"], timeOfDay: "evening" }), R({ slug: "short", minutes: 5 })];
    expect(chooseRitual({ ...base, rituals })).toBe("short");
  });

  it("prefers her Dosha, her concerns and the time of day", () => {
    const rituals = [
      R({ slug: "morning-kapha", doshas: ["kapha"], timeOfDay: "morning" }),
      R({ slug: "evening-vata", doshas: ["vata"], timeOfDay: "evening", concerns: ["hard_to_unwind"] }),
    ];
    expect(chooseRitual({ ...base, concerns: ["hard_to_unwind"], rituals })).toBe("evening-vata");
  });

  it("does not repeat yesterday's card while another fits", () => {
    const rituals = [R({ slug: "a", doshas: ["vata"] }), R({ slug: "b" })];
    expect(chooseRitual({ ...base, rituals, recent: ["a"] })).toBe("b");
    expect(chooseRitual({ ...base, rituals: [rituals[0]], recent: ["a"] })).toBe("a");
  });

  it("says so when nothing fits, instead of an empty card", () => {
    expect(() => chooseRitual({ ...base, rituals: [] })).toThrow("sahamaNoRitual");
    expect(() => chooseRitual({ ...base, minutes: 5, rituals: [R({ slug: "x", minutes: 10 })] })).toThrow("sahamaNoRitual");
  });

  it("breaks ties by the operator's order", () => {
    const rituals = [R({ slug: "second", position: 20 }), R({ slug: "first", position: 10 })];
    expect(chooseRitual({ ...base, rituals })).toBe("first");
  });
});

describe("access — one question for every caller", () => {
  it("free is open to everyone, plus only with the plan", () => {
    expect(mayUseTier("free", false)).toBe(true);
    expect(mayUseTier("plus", false)).toBe(false);
    expect(mayUseTier("plus", true)).toBe(true);
  });
});

describe("content/sahama/rituals.json — what the applier will write", () => {
  const file = JSON.parse(readFileSync(join(__dirname, "..", "..", "content", "sahama", "rituals.json"), "utf8"));
  const rituals: Array<Record<string, unknown>> = file.rituals;

  it("has unique slugs in the anchor-safe form", () => {
    const slugs = rituals.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("uses only the known vocabularies", () => {
    for (const r of rituals) {
      expect(MINUTE_OPTIONS as readonly number[], String(r.slug)).toContain(r.minutes);
      expect(TIMES_OF_DAY as readonly string[], String(r.slug)).toContain(r.timeOfDay);
      expect(["free", "plus"], String(r.slug)).toContain(r.tier);
      for (const d of r.doshas as string[]) expect(DOSHAS as readonly string[]).toContain(d);
      for (const c of r.concerns as string[]) expect(CONCERNS as readonly string[]).toContain(c);
      expect(String(r.title).length, String(r.slug)).toBeGreaterThan(0);
      expect(String(r.body).length, String(r.slug)).toBeGreaterThan(40);
    }
  });

  it("offers at least one free ritual for every time budget, so a new member always gets a card", () => {
    for (const m of MINUTE_OPTIONS) {
      expect(rituals.some((r) => r.tier === "free" && (r.minutes as number) <= m), `${m} min`).toBe(true);
    }
  });

  it("keeps the wording rules: no healing promises, no herbs or cures", () => {
    const forbidden = /heil(t|ung|en)\b|gegen (schmerz|krank)|therapie|ashwagandha|triphala|kapsel|dosierung|detox|fasten|panchakarma|garantiert/i;
    for (const r of rituals) expect(`${r.title} ${r.summary} ${r.body}`, String(r.slug)).not.toMatch(forbidden);
  });
});
