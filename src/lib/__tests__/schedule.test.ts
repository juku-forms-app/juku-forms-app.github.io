import { describe, expect, it } from "vitest";
import { generatePlanRows, inferYear } from "../schedule";
import { advanceSheet } from "../students";
import { blankRow, blankSheet } from "../rows";
import { normalizeSheet, emptyRoster } from "../normalize";
import { activeEntry, rosterReducer } from "../../state/rosterReducer";
import type { StudentSheet, WeeklySlot } from "../../types";

const slot = (p: Partial<WeeklySlot>): WeeklySlot => ({ weekday: 1, start: "16:40", end: "18:10", subject: "英語", ...p });
const sheet = (p: Partial<StudentSheet>): StudentSheet => ({ ...blankSheet(), ...p });
const oct9 = new Date(2026, 9, 9);

describe("inferYear（今日に一番近い年）", () => {
  it("同じ年の月", () => {
    expect(inferYear(11, oct9)).toBe(2026);
    expect(inferYear(9, oct9)).toBe(2026);
  });
  it("12月に1月の予定を作るなら翌年、1月に12月の実施なら前年", () => {
    expect(inferYear(1, new Date(2026, 11, 20))).toBe(2027);
    expect(inferYear(12, new Date(2027, 0, 5))).toBe(2026);
  });
});

describe("generatePlanRows", () => {
  it("2026年10月の木曜日（1・8・15・22・29日）を拾う", () => {
    const rows = generatePlanRows([slot({ weekday: 4, subject: "数学" })], "10", oct9);
    expect(rows.map((r) => r.d)).toEqual(["1", "8", "15", "22", "29"]);
    expect(rows[0]).toEqual({ m: "10", d: "1", type: "通常", start: "16:40", end: "18:10", subject: "数学" });
  });

  it("複数コマは日付順、同じ日は開始時刻順", () => {
    const rows = generatePlanRows(
      [slot({ weekday: 4, start: "19:00", end: "20:30", subject: "数学" }), slot({ weekday: 1 }), slot({ weekday: 4, start: "17:00", end: "18:30", subject: "英語" })],
      "10",
      oct9,
    );
    // 2026年10月：月曜は 5,12,19,26 ／ 木曜は 1,8,15,22,29
    expect(rows.slice(0, 3).map((r) => `${r.d} ${r.start} ${r.subject}`)).toEqual([
      "1 17:00 英語",
      "1 19:00 数学",
      "5 16:40 英語",
    ]);
    expect(rows).toHaveLength(4 + 5 * 2);
  });

  it("何も入っていないコマは無視し、月が読めなければ空", () => {
    expect(generatePlanRows([slot({ start: "", end: "", subject: "" })], "10", oct9)).toEqual([]);
    expect(generatePlanRows([slot({})], "", oct9)).toEqual([]);
  });
});

describe("いつもの授業の保存と引き継ぎ", () => {
  it("旧データ（schedule なし）は空、不正な曜日は直す", () => {
    expect(normalizeSheet({ student: "佐藤" }).schedule).toEqual([]);
    const s = normalizeSheet({ schedule: [{ weekday: 9, start: "16:40", subject: "英語" }, "x"] });
    expect(s.schedule).toEqual([{ weekday: 1, start: "16:40", end: "", subject: "英語" }]);
  });

  it("翌月へ進めると、予定→実施のあと新しい授業予定を曜日から作る", () => {
    const src = sheet({
      month: "9",
      planMonth: "10",
      planRows: [{ ...blankRow(), m: "10", d: "1", subject: "数学" }],
      schedule: [slot({ weekday: 4, subject: "数学" })],
    });
    const n = advanceSheet(src, "2026-10-01")!;
    expect(n.month).toBe("10");
    expect(n.planMonth).toBe("11");
    expect(n.doneRows[0].d).toBe("1");
    // 2026年11月の木曜：5,12,19,26
    expect(n.planRows.map((r) => r.d)).toEqual(["5", "12", "19", "26"]);
    expect(n.schedule).toEqual(src.schedule);
  });

  it("いつもの授業が無ければ、今までどおり予定は空", () => {
    const n = advanceSheet(sheet({ month: "9" }), "2026-10-01")!;
    expect(n.planRows.every((r) => !r.d)).toBe(true);
  });

  it("reducer：コマの追加・変更・削除と、予定の自動作成", () => {
    let r = emptyRoster();
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "9" }); // 予定は10月
    r = rosterReducer(r, { type: "addSlot" });
    r = rosterReducer(r, { type: "setSlot", index: 0, field: "weekday", value: "4" });
    r = rosterReducer(r, { type: "setSlot", index: 0, field: "subject", value: "数学" });
    r = rosterReducer(r, { type: "addSlot" });
    r = rosterReducer(r, { type: "removeSlot", index: 1 });
    expect(activeEntry(r).sheet.schedule).toEqual([{ weekday: 4, start: "", end: "", subject: "数学" }]);
    r = rosterReducer(r, { type: "fillPlanFromSchedule", today: "2026-10-09" });
    expect(activeEntry(r).sheet.planRows.map((x) => x.d)).toEqual(["1", "8", "15", "22", "29"]);
  });
});
