import type {
  ClinicInfo,
  CountBlock,
  LessonRow,
  Roster,
  RosterEntry,
  RowsKey,
  StudentSheet,
  WeeklySlot,
} from "../types";
import { blankRow, cloneRows, duplicateRow, nextMonth, removeRow } from "../lib/rows";
import { newEntry } from "../lib/normalize";
import { advanceSheet } from "../lib/students";
import { blankSlot, generatePlanRows, parseISODate } from "../lib/schedule";

type MetaKey = "month" | "planMonth" | "student" | "teacher" | "dept" | "submitDate";

export type Action =
  | { type: "setMeta"; key: MetaKey; value: string }
  | { type: "setClinic"; key: keyof ClinicInfo; value: string }
  | { type: "setRow"; list: RowsKey; index: number; field: keyof LessonRow; value: string }
  | { type: "addRow"; list: RowsKey }
  | { type: "duplicateRow"; list: RowsKey; index: number }
  | { type: "removeRow"; list: RowsKey; index: number }
  | { type: "copyRows"; from: RowsKey; to: RowsKey }
  | { type: "setCount"; index: number; field: keyof CountBlock; value: string }
  | { type: "selectStudent"; id: string }
  | { type: "addStudent"; entry?: RosterEntry }
  | { type: "removeStudent"; id: string }
  | { type: "replaceStudentSheet"; id: string; sheet: StudentSheet }
  | { type: "setClinicAll"; clinic: ClinicInfo }
  | { type: "replaceAll"; roster: Roster }
  | { type: "advanceMonth"; ids: string[]; today: string }
  | { type: "importSheets"; replace: { id: string; sheet: StudentSheet }[]; add: StudentSheet[] }
  | { type: "addSlot" }
  | { type: "setSlot"; index: number; field: keyof WeeklySlot; value: string }
  | { type: "removeSlot"; index: number }
  | { type: "fillPlanFromSchedule"; today: string };

export function activeEntry(r: Roster): RosterEntry {
  return r.entries.find((e) => e.id === r.activeId) ?? r.entries[0];
}

/** 表示中の生徒の帳票だけを書き換える */
function updateActive(r: Roster, fn: (s: StudentSheet) => StudentSheet): Roster {
  const now = new Date().toISOString();
  return {
    ...r,
    entries: r.entries.map((e) => (e.id === r.activeId ? { ...e, sheet: fn(e.sheet), updatedAt: now } : e)),
  };
}

export function rosterReducer(r: Roster, a: Action): Roster {
  switch (a.type) {
    case "setMeta":
      if (a.key === "month") {
        // 授業予定の月が「対象月の翌月」のまま（または空）なら、対象月に合わせて翌月へ動かす
        return updateActive(r, (s) => {
          const following = !s.planMonth || s.planMonth === nextMonth(s.month);
          return { ...s, month: a.value, planMonth: following ? nextMonth(a.value) : s.planMonth };
        });
      }
      return updateActive(r, (s) => ({ ...s, [a.key]: a.value }));
    case "setClinic":
      return { ...r, clinic: { ...r.clinic, [a.key]: a.value } };
    case "setClinicAll":
      return { ...r, clinic: a.clinic };
    case "setRow":
      return updateActive(r, (s) => ({
        ...s,
        [a.list]: s[a.list].map((row, i) => (i === a.index ? { ...row, [a.field]: a.value } : row)),
      }));
    case "addRow":
      return updateActive(r, (s) => ({ ...s, [a.list]: [...s[a.list], blankRow()] }));
    case "duplicateRow":
      return updateActive(r, (s) => ({ ...s, [a.list]: duplicateRow(s[a.list], a.index) }));
    case "removeRow":
      return updateActive(r, (s) => ({ ...s, [a.list]: removeRow(s[a.list], a.index) }));
    case "copyRows":
      return updateActive(r, (s) => ({ ...s, [a.to]: cloneRows(s[a.from]) }));
    case "setCount":
      return updateActive(r, (s) => ({
        ...s,
        countBlocks: s.countBlocks.map((b, i) => (i === a.index ? { ...b, [a.field]: a.value } : b)),
      }));
    case "selectStudent":
      return r.entries.some((e) => e.id === a.id) ? { ...r, activeId: a.id } : r;
    case "addStudent": {
      const entry = a.entry ?? newEntry();
      return { ...r, entries: [...r.entries, entry], activeId: entry.id };
    }
    case "removeStudent": {
      const idx = r.entries.findIndex((e) => e.id === a.id);
      if (idx < 0) return r;
      const entries = r.entries.filter((e) => e.id !== a.id);
      if (!entries.length) {
        const fresh = newEntry();
        return { ...r, entries: [fresh], activeId: fresh.id };
      }
      const activeId = r.activeId === a.id ? entries[Math.min(idx, entries.length - 1)].id : r.activeId;
      return { ...r, entries, activeId };
    }
    case "replaceStudentSheet":
      return {
        ...r,
        activeId: a.id,
        entries: r.entries.map((e) =>
          e.id === a.id ? { ...e, sheet: a.sheet, updatedAt: new Date().toISOString() } : e,
        ),
      };
    case "replaceAll":
      return a.roster;
    case "importSheets": {
      const now = new Date().toISOString();
      const repl = new Map(a.replace.map((x) => [x.id, x.sheet]));
      const entries = r.entries.map((e) => {
        const sheet = repl.get(e.id);
        return sheet ? { ...e, sheet, updatedAt: now } : e;
      });
      return { ...r, entries: [...entries, ...a.add.map((s) => newEntry(s))] };
    }
    case "addSlot":
      return updateActive(r, (s) => ({ ...s, schedule: [...s.schedule, blankSlot()] }));
    case "setSlot":
      return updateActive(r, (s) => ({
        ...s,
        schedule: s.schedule.map((x, i) =>
          i === a.index ? { ...x, [a.field]: a.field === "weekday" ? Number(a.value) : a.value } : x,
        ),
      }));
    case "removeSlot":
      return updateActive(r, (s) => ({ ...s, schedule: s.schedule.filter((_, i) => i !== a.index) }));
    case "fillPlanFromSchedule":
      return updateActive(r, (s) => {
        const rows = generatePlanRows(s.schedule, s.planMonth, parseISODate(a.today));
        return rows.length ? { ...s, planRows: rows } : s;
      });
    case "advanceMonth": {
      const ids = new Set(a.ids);
      const now = new Date().toISOString();
      return {
        ...r,
        entries: r.entries.map((e) => {
          const next = ids.has(e.id) ? advanceSheet(e.sheet, a.today) : null;
          return next ? { ...e, sheet: next, updatedAt: now } : e;
        }),
      };
    }
  }
}
