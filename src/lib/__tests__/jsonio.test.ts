import { describe, expect, it } from "vitest";
import { exportRosterJSON, exportSheetJSON, mergeClinicFillEmpty, parseImport } from "../jsonio";
import { emptyRoster } from "../normalize";

describe("jsonio", () => {
  it("生徒1人分は試作HTMLと同じ SheetData 形式で往復できる", () => {
    const r = emptyRoster();
    r.clinic = { clinicName: "A塾", manager: "教室長", tel: "06" };
    r.entries[0].sheet.student = "山田";
    const text = exportSheetJSON(r.entries[0], r.clinic);
    const flat = JSON.parse(text);
    expect(flat).toMatchObject({ student: "山田", clinicName: "A塾", manager: "教室長", tel: "06" });
    const back = parseImport(text);
    expect(back.kind).toBe("sheet");
    if (back.kind !== "sheet") return;
    expect(back.sheet).toEqual(r.entries[0].sheet);
    expect(back.clinic).toEqual(r.clinic);
  });

  it("試作HTMLが書き出したJSON（activeTab付き）も読める", () => {
    const proto = {
      month: "8", student: "佐藤", teacher: "近大", dept: "中等部",
      clinicName: "", manager: "", tel: "", submitDate: "2026-08-31",
      doneRows: [{ m: "8", d: "1", type: "振替(前月分)", start: "16:40", end: "18:10", subject: "英語" }],
      planRows: [], countBlocks: [], activeTab: "done",
    };
    const res = parseImport(JSON.stringify(proto));
    expect(res.kind).toBe("sheet");
    if (res.kind !== "sheet") return;
    expect(res.sheet.doneRows[0].type).toBe("振替(前月分)");
    expect("activeTab" in res.sheet).toBe(false);
  });

  it("全体バックアップを判別して復元する", () => {
    const r = emptyRoster();
    const res = parseImport(exportRosterJSON(r));
    expect(res).toEqual({ kind: "roster", roster: r });
  });

  it("関係ないJSONや壊れたJSONはエラー", () => {
    expect(() => parseImport("not json")).toThrow(/JSON/);
    expect(() => parseImport('{"foo":1}')).toThrow(/形式/);
    expect(() => parseImport("[1,2]")).toThrow(/形式/);
  });

  it("塾情報は空欄だけ埋める", () => {
    expect(
      mergeClinicFillEmpty({ clinicName: "A", manager: "", tel: "" }, { clinicName: "B", manager: "M", tel: "" }),
    ).toEqual({ clinicName: "A", manager: "M", tel: "" });
  });
});

describe("planMonth の補完", () => {
  it("planMonth の無い旧データ・試作JSONは対象月の翌月、\"09\" は \"9\" に揃える", () => {
    const res = parseImport(JSON.stringify({ month: "09", student: "佐藤", doneRows: [] }));
    if (res.kind !== "sheet") throw new Error();
    expect(res.sheet.month).toBe("9");
    expect(res.sheet.planMonth).toBe("10");
  });
  it("planMonth があればそれを使う", () => {
    const res = parseImport(JSON.stringify({ month: "9", planMonth: "11", student: "佐藤" }));
    if (res.kind !== "sheet") throw new Error();
    expect(res.sheet.planMonth).toBe("11");
  });
});
