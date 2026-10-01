import { describe, expect, it } from "vitest";
import { activeEntry, rosterReducer } from "../../state/rosterReducer";
import { emptyRoster, newEntry } from "../normalize";

describe("rosterReducer", () => {
  it("編集は表示中の生徒にだけ効く", () => {
    let r = emptyRoster();
    const firstId = r.activeId;
    r = rosterReducer(r, { type: "addStudent" });
    r = rosterReducer(r, { type: "setMeta", key: "student", value: "二人目" });
    expect(activeEntry(r).sheet.student).toBe("二人目");
    expect(r.entries.find((e) => e.id === firstId)!.sheet.student).toBe("");
  });

  it("予定→実施コピーは複製（参照を共有しない）", () => {
    let r = emptyRoster();
    r = rosterReducer(r, { type: "setRow", list: "planRows", index: 0, field: "subject", value: "英語" });
    r = rosterReducer(r, { type: "copyRows", from: "planRows", to: "doneRows" });
    const s = activeEntry(r).sheet;
    expect(s.doneRows.map((x) => x.subject)).toEqual(s.planRows.map((x) => x.subject));
    expect(s.doneRows[0]).not.toBe(s.planRows[0]);
  });

  it("表示中の生徒を消すと隣に移り、全員消すと空の生徒が1人残る", () => {
    const a = newEntry(), b = newEntry(), c = newEntry();
    let r = { ...emptyRoster(), entries: [a, b, c], activeId: b.id };
    r = rosterReducer(r, { type: "removeStudent", id: b.id });
    expect(r.activeId).toBe(c.id);
    r = rosterReducer(r, { type: "removeStudent", id: c.id });
    expect(r.activeId).toBe(a.id);
    r = rosterReducer(r, { type: "removeStudent", id: a.id });
    expect(r.entries).toHaveLength(1);
    expect(r.activeId).toBe(r.entries[0].id);
  });
});

describe("授業予定の月", () => {
  it("初期値は対象月の翌月で、対象月を変えると追従する", () => {
    let r = emptyRoster();
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "9" });
    expect(activeEntry(r).sheet.planMonth).toBe("10");
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "12" });
    expect(activeEntry(r).sheet.planMonth).toBe("1");
  });
  it("手で変えた後は対象月を変えても上書きしない", () => {
    let r = emptyRoster();
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "9" });
    r = rosterReducer(r, { type: "setMeta", key: "planMonth", value: "11" });
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "10" });
    expect(activeEntry(r).sheet.planMonth).toBe("11");
  });
  it("手で翌月に戻せば、また追従する", () => {
    let r = emptyRoster();
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "9" });
    r = rosterReducer(r, { type: "setMeta", key: "planMonth", value: "10" });
    r = rosterReducer(r, { type: "setMeta", key: "month", value: "10" });
    expect(activeEntry(r).sheet.planMonth).toBe("11");
  });
});
