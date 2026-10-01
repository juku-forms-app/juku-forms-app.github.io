import { describe, expect, it } from "vitest";
import { bundleFileName, exportBundleJSON, parseImport, planBundleImport } from "../jsonio";
import { blankSheet } from "../rows";
import { emptyRoster, newEntry } from "../normalize";
import { rosterReducer } from "../../state/rosterReducer";
import type { StudentSheet } from "../../types";

const sheet = (p: Partial<StudentSheet>): StudentSheet => ({ ...blankSheet(), ...p });

describe("まとめて送る（複数生徒の束）", () => {
  const a = newEntry(sheet({ student: "山田", teacher: "近大", month: "9" }));
  const b = newEntry(sheet({ student: "佐藤", teacher: "近大", month: "9" }));

  it("束で書き出して読み込むと、生徒ごとの帳票が戻る。塾情報は含めない", () => {
    const text = exportBundleJSON([a, b]);
    expect(text).not.toMatch(/clinicName|manager|"tel"/);
    const res = parseImport(text);
    expect(res.kind).toBe("bundle");
    if (res.kind !== "bundle") return;
    expect(res.sheets).toEqual([a.sheet, b.sheet]);
  });

  it("ファイル名に講師名・月・人数が入る", () => {
    expect(bundleFileName([a, b])).toBe("帳票_近大_9月_2人.json");
    const other = newEntry(sheet({ student: "鈴木", teacher: "別", month: "10" }));
    expect(bundleFileName([a, other])).toBe("帳票_複数講師_2人.json");
  });

  it("生徒名＋講師名が同じなら上書き、いなければ追加", () => {
    const existing = [
      newEntry(sheet({ student: "山田", teacher: "近大", month: "8" })),
      newEntry(sheet({ student: "佐藤", teacher: "別の講師" })),
    ];
    const plan = planBundleImport(existing, [a.sheet, b.sheet]);
    expect(plan.replace).toEqual([{ id: existing[0].id, sheet: a.sheet }]);
    expect(plan.add).toEqual([b.sheet]); // 佐藤は講師が違うので別人扱い
  });

  it("名前の前後の空白は無視して照合する", () => {
    const existing = [newEntry(sheet({ student: " 山田 ", teacher: "近大 " }))];
    expect(planBundleImport(existing, [a.sheet]).replace).toHaveLength(1);
  });

  it("名前が空の帳票は照合せず追加する", () => {
    const existing = [newEntry(sheet({ student: "" }))];
    expect(planBundleImport(existing, [sheet({ student: "" })]).add).toHaveLength(1);
  });

  it("reducer：上書きと追加を一度に反映する", () => {
    const base = emptyRoster();
    const target = base.entries[0];
    const r = rosterReducer(base, {
      type: "importSheets",
      replace: [{ id: target.id, sheet: a.sheet }],
      add: [b.sheet],
    });
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0].sheet.student).toBe("山田");
    expect(r.entries[1].sheet.student).toBe("佐藤");
    expect(r.entries[1].id).not.toBe(target.id);
  });
});
