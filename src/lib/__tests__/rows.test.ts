import { describe, expect, it } from "vitest";
import { blankRow, duplicateRow, lessonCount, nextMonth, removeRow, rowFilled } from "../rows";
import { validateRows } from "../validate";
import type { LessonRow } from "../../types";

const row = (p: Partial<LessonRow>): LessonRow => ({ ...blankRow(), ...p });

describe("rowFilled / lessonCount", () => {
  it("空行は数えない。種類を変えただけでも入力扱い", () => {
    expect(rowFilled(blankRow())).toBe(false);
    expect(rowFilled(row({ subject: "  " }))).toBe(false);
    expect(rowFilled(row({ type: "定期対策" }))).toBe(true);
    expect(lessonCount([blankRow(), row({ d: "3" }), row({ subject: "英語" })])).toBe(2);
  });
});

describe("duplicateRow", () => {
  it("直後に日付だけ空の複製を入れる", () => {
    const src = row({ m: "8", d: "3", type: "定期対策", start: "16:40", end: "18:10", subject: "数学" });
    const out = duplicateRow([src, row({ subject: "英語" })], 0);
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual({ ...src, m: "", d: "" });
    expect(out[2].subject).toBe("英語");
    expect(out[0]).not.toBe(out[1]);
  });
  it("範囲外なら何もしない", () => {
    const rows = [blankRow()];
    expect(duplicateRow(rows, 5)).toBe(rows);
  });
});

describe("removeRow", () => {
  it("最後の1行を消すと空行が1つ残る", () => {
    expect(removeRow([row({ d: "1" })], 0)).toEqual([blankRow()]);
  });
});

describe("validateRows", () => {
  it("日付未入力と終了<=開始を警告し、空行は無視する", () => {
    const w = validateRows([
      {
        label: "実施報告書",
        rows: [
          blankRow(),
          row({ subject: "英語" }),
          row({ m: "8", d: "1", start: "18:10", end: "16:40" }),
          row({ m: "8", d: "2", start: "16:40", end: "16:40" }),
          row({ m: "8", d: "3", start: "16:40", end: "18:10" }),
        ],
      },
    ]);
    expect(w).toEqual([
      "実施報告書 2行目：日付が未入力",
      "実施報告書 3行目：終了が開始より前",
      "実施報告書 4行目：終了が開始より前",
    ]);
  });
});

describe("validateRows: ページ収まり", () => {
  it("16行までは警告なし、17行で警告", () => {
    expect(validateRows([{ label: "授業予定", rows: Array.from({ length: 16 }, blankRow) }])).toEqual([]);
    const w = validateRows([{ label: "授業予定", rows: Array.from({ length: 17 }, blankRow) }]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/^授業予定：17行あり1ページに収まりません/);
  });
});

describe("授業予定の月", () => {
  it("翌月、12月の次は1月、読めない値は空", () => {
    expect(nextMonth("8")).toBe("9");
    expect(nextMonth(" 12 ")).toBe("1");
    expect(nextMonth("")).toBe("");
    expect(nextMonth("13")).toBe("");
    expect(nextMonth("abc")).toBe("");
  });
});
