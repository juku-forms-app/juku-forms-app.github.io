import { describe, expect, it } from "vitest";
import { advanceSheet, filterByTeacher, NO_TEACHER, sortEntries, studentStatus, teacherOptions } from "../students";
import { blankRow, blankSheet } from "../rows";
import { newEntry } from "../normalize";
import { rosterReducer } from "../../state/rosterReducer";
import { emptyRoster } from "../normalize";
import type { StudentSheet } from "../../types";

const sheet = (p: Partial<StudentSheet>): StudentSheet => ({ ...blankSheet(), ...p });

describe("一覧", () => {
  const a = newEntry(sheet({ student: "山田", teacher: "近大" }));
  const b = newEntry(sheet({ student: "佐藤", teacher: "近大" }));
  const c = newEntry(sheet({ student: "鈴木", teacher: "" }));

  it("講師の選択肢は重複なし、未入力はまとめる", () => {
    expect(teacherOptions([a, b, c]).sort()).toEqual(["近大", NO_TEACHER].sort());
  });
  it("講師で絞り込み。空文字なら全員", () => {
    expect(filterByTeacher([a, b, c], "近大")).toEqual([a, b]);
    expect(filterByTeacher([a, b, c], NO_TEACHER)).toEqual([c]);
    expect(filterByTeacher([a, b, c], "")).toHaveLength(3);
  });
  it("講師→生徒名の順に並ぶ", () => {
    const sorted = sortEntries([c, a, b]).map((e) => e.sheet.student);
    expect(sorted.indexOf("佐藤")).toBeLessThan(sorted.indexOf("山田"));
  });
  it("状態：回数の入力有無・回数・警告・はみ出し", () => {
    const s = studentStatus(
      sheet({
        doneRows: [{ ...blankRow(), subject: "英語" }, ...Array.from({ length: 16 }, blankRow)],
        countBlocks: [{ subject: "数学", 通常: "", 持ち越し: "", 定期対策: "" }],
      }),
    );
    expect(s).toMatchObject({ countFilled: true, done: 1, plan: 0, overflow: true });
    expect(s.warnings.length).toBe(2); // 17行 + 日付未入力
    expect(studentStatus(blankSheet()).countFilled).toBe(false);
  });
});

describe("advanceSheet（翌月へ進める）", () => {
  const plan = [{ m: "10", d: "2", type: "通常" as const, start: "16:40", end: "18:10", subject: "英語" }];
  const src = sheet({
    month: "9",
    student: "山田",
    teacher: "近大",
    submitDate: "2026-09-30",
    doneRows: [{ ...blankRow(), m: "9", d: "4", subject: "数学" }],
    planRows: plan,
    countBlocks: [{ subject: "数学", 通常: "4", 持ち越し: "1", 定期対策: "2" }],
  });

  it("対象月+1、予定→実施、予定は空、回数は科目だけ残す", () => {
    const n = advanceSheet(src, "2026-10-01")!;
    expect(n.month).toBe("10");
    expect(n.planMonth).toBe("11");
    expect(n.student).toBe("山田");
    expect(n.teacher).toBe("近大");
    expect(n.submitDate).toBe("2026-10-01");
    expect(n.doneRows).toEqual(plan);
    expect(n.doneRows[0]).not.toBe(plan[0]);
    expect(n.planRows.every((r) => !r.subject && !r.d)).toBe(true);
    expect(n.countBlocks[0]).toEqual({ subject: "数学", 通常: "", 持ち越し: "", 定期対策: "" });
  });
  it("12月→1月。予定が空なら実施は空行", () => {
    const n = advanceSheet(sheet({ month: "12" }), "2027-01-01")!;
    expect(n.month).toBe("1");
    expect(n.doneRows.every((r) => !r.subject)).toBe(true);
  });
  it("対象月が未入力なら進めない", () => {
    expect(advanceSheet(sheet({ month: "" }), "2026-10-01")).toBeNull();
  });
  it("reducer：選んだ生徒だけ進め、進められない生徒はそのまま", () => {
    const a = newEntry(sheet({ month: "9" }));
    const b = newEntry(sheet({ month: "9" }));
    const c = newEntry(sheet({ month: "" }));
    const r = rosterReducer(
      { ...emptyRoster(), entries: [a, b, c], activeId: a.id },
      { type: "advanceMonth", ids: [a.id, c.id], today: "2026-10-01" },
    );
    expect(r.entries.map((e) => e.sheet.month)).toEqual(["10", "9", ""]);
  });
});
