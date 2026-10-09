import { describe, expect, it } from "vitest";
import { holidayName, holidaysOf } from "../holidays";
import { generatePlan } from "../schedule";
import type { WeeklySlot } from "../../types";

const list = (y: number) => [...holidaysOf(y).entries()].map(([md, name]) => `${md} ${name}`);

describe("日本の祝日（内閣府の一覧と照合）", () => {
  it("2026年：振替休日 5/6・国民の休日 9/22 を含む18日", () => {
    expect(list(2026)).toEqual([
      "1-1 元日",
      "1-12 成人の日",
      "2-11 建国記念の日",
      "2-23 天皇誕生日",
      "3-20 春分の日",
      "4-29 昭和の日",
      "5-3 憲法記念日",
      "5-4 みどりの日",
      "5-5 こどもの日",
      "5-6 振替休日",
      "7-20 海の日",
      "8-11 山の日",
      "9-21 敬老の日",
      "9-22 国民の休日",
      "9-23 秋分の日",
      "10-12 スポーツの日",
      "11-3 文化の日",
      "11-23 勤労感謝の日",
    ]);
  });

  it("2027年：春分の日が日曜で 3/22 が振替休日", () => {
    expect(list(2027)).toEqual([
      "1-1 元日",
      "1-11 成人の日",
      "2-11 建国記念の日",
      "2-23 天皇誕生日",
      "3-21 春分の日",
      "3-22 振替休日",
      "4-29 昭和の日",
      "5-3 憲法記念日",
      "5-4 みどりの日",
      "5-5 こどもの日",
      "7-19 海の日",
      "8-11 山の日",
      "9-20 敬老の日",
      "9-23 秋分の日",
      "10-11 スポーツの日",
      "11-3 文化の日",
      "11-23 勤労感謝の日",
    ]);
  });

  it("holidayName：祝日でなければ undefined", () => {
    expect(holidayName(new Date(2026, 10, 3))).toBe("文化の日");
    expect(holidayName(new Date(2026, 10, 4))).toBeUndefined();
  });
});

describe("授業予定の作成で祝日を外す", () => {
  const mon: WeeklySlot = { weekday: 1, start: "16:40", end: "18:10", subject: "英語" };
  const tue: WeeklySlot = { weekday: 2, start: "16:40", end: "18:10", subject: "数学" };

  it("2026年11月：月曜の 11/23（勤労感謝の日）、火曜の 11/3（文化の日）を外し、外した日を返す", () => {
    const { rows, skipped } = generatePlan([mon, tue], "11", new Date(2026, 9, 9));
    expect(rows.filter((r) => r.subject === "英語").map((r) => r.d)).toEqual(["2", "9", "16", "30"]);
    expect(rows.filter((r) => r.subject === "数学").map((r) => r.d)).toEqual(["10", "17", "24"]);
    expect(skipped).toEqual([
      { m: "11", d: "3", name: "文化の日" },
      { m: "11", d: "23", name: "勤労感謝の日" },
    ]);
  });

  it("同じ祝日に2コマあっても、外した日は1回だけ数える", () => {
    const { skipped } = generatePlan([mon, { ...mon, start: "19:00", subject: "数学" }], "11", new Date(2026, 9, 9));
    expect(skipped).toEqual([{ m: "11", d: "23", name: "勤労感謝の日" }]);
  });
});
