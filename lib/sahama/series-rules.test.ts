import { describe, expect, it } from "vitest";

import seriesFile from "@/content/sahama/series.json";
import ritualsFile from "@/content/sahama/rituals.json";

import {
  daysBetween,
  isComingBack,
  parseSeriesFile,
  seriesState,
} from "./series-rules";

describe("the series file the app ships", () => {
  const series = parseSeriesFile(seriesFile);

  it("parses", () => {
    expect(series.length).toBeGreaterThan(0);
  });

  it("names only rituals that exist in the repo", () => {
    // An operator ritual (admin surface) may also be named, but the shipped
    // file must not depend on rows only one database holds.
    const known = new Set(
      (ritualsFile as { rituals: { slug: string }[] }).rituals.map(
        (r) => r.slug,
      ),
    );
    for (const s of series)
      for (const d of s.days)
        expect(known, `${s.slug}: ${d.ritual}`).toContain(d.ritual);
  });
});

describe("parseSeriesFile", () => {
  const ok = {
    slug: "a",
    title: "A",
    summary: "s",
    intro: "i",
    days: [{ ritual: "r", note: "n" }],
  };

  it("refuses a duplicate slug", () => {
    expect(() => parseSeriesFile({ series: [ok, ok] })).toThrow(/duplicate/);
  });

  it("refuses a day without a note", () => {
    expect(() =>
      parseSeriesFile({
        series: [{ ...ok, days: [{ ritual: "r", note: "" }] }],
      }),
    ).toThrow(/note/);
  });

  it("refuses a series with no days", () => {
    expect(() => parseSeriesFile({ series: [{ ...ok, days: [] }] })).toThrow(
      /no days/,
    );
  });
});

describe("seriesState", () => {
  const today = "2026-11-20";

  it("is notStarted without progress", () => {
    expect(seriesState(null, 7, today)).toEqual({ status: "notStarted" });
  });

  it("opens day 1 right after starting", () => {
    expect(seriesState({ doneDays: 0, lastDoneOn: null }, 7, today)).toEqual({
      status: "open",
      day: 1,
    });
  });

  it("opens one day per calendar day, never two", () => {
    expect(seriesState({ doneDays: 2, lastDoneOn: today }, 7, today)).toEqual({
      status: "doneToday",
      nextDay: 3,
    });
    expect(
      seriesState({ doneDays: 2, lastDoneOn: "2026-11-19" }, 7, today),
    ).toEqual({ status: "open", day: 3 });
  });

  it("waits through a pause instead of skipping days", () => {
    expect(
      seriesState({ doneDays: 3, lastDoneOn: "2026-11-01" }, 7, today),
    ).toEqual({ status: "open", day: 4 });
  });

  it("is finished after the last day, even on the same day", () => {
    expect(seriesState({ doneDays: 7, lastDoneOn: today }, 7, today)).toEqual({
      status: "finished",
    });
  });

  it("treats a series that got shorter as finished, not as day 8 of 5", () => {
    expect(seriesState({ doneDays: 7, lastDoneOn: null }, 5, today)).toEqual({
      status: "finished",
    });
  });
});

describe("coming back", () => {
  it("counts whole Berlin days", () => {
    expect(daysBetween("2026-11-18", "2026-11-20")).toBe(2);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // across DST
  });

  it("is a return after two or more days, not after one", () => {
    expect(
      isComingBack({ doneDays: 1, lastDoneOn: "2026-11-19" }, "2026-11-20"),
    ).toBe(false);
    expect(
      isComingBack({ doneDays: 1, lastDoneOn: "2026-11-18" }, "2026-11-20"),
    ).toBe(true);
    expect(isComingBack({ doneDays: 0, lastDoneOn: null }, "2026-11-20")).toBe(
      false,
    );
  });
});
