import { beforeEach, describe, expect, it } from "vitest";
import { CORRUPT_KEY, loadRoster, saveRoster, STORAGE_KEY } from "../storage";
import { emptyRoster } from "../normalize";

beforeEach(() => localStorage.clear());

describe("storage", () => {
  it("保存したものがそのまま読める", () => {
    const r = emptyRoster();
    r.clinic.clinicName = "テスト塾";
    r.entries[0].sheet.student = "山田";
    expect(saveRoster(r)).toEqual({ ok: true });
    const { roster, warning } = loadRoster();
    expect(warning).toBeUndefined();
    expect(roster).toEqual(r);
  });

  it("未保存なら空のロスター", () => {
    const { roster } = loadRoster();
    expect(roster.entries).toHaveLength(1);
    expect(roster.activeId).toBe(roster.entries[0].id);
  });

  it("壊れたデータは退避して新規で開く", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    const { roster, warning } = loadRoster();
    expect(warning).toMatch(/壊れて/);
    expect(localStorage.getItem(CORRUPT_KEY)).toBe("{broken");
    expect(roster.entries).toHaveLength(1);
  });

  it("欠けた項目や不正な値は補正する", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeId: "missing",
        entries: [{ id: "a", sheet: { student: "田中", doneRows: [{ m: 8, type: "謎" }], countBlocks: [] } }],
      }),
    );
    const { roster } = loadRoster();
    expect(roster.activeId).toBe("a");
    const s = roster.entries[0].sheet;
    expect(s.doneRows[0]).toMatchObject({ m: "8", type: "通常", subject: "" });
    expect(s.planRows).toHaveLength(1);
    expect(s.countBlocks).toHaveLength(5);
    expect(s.dept).toBe("中等部");
  });
});
