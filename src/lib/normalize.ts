// localStorage や JSONファイルなど、外から来たデータを型どおりの形に整える。
// 欠けた項目は既定値で埋め、型の合わない値は捨てる（壊れたデータでアプリが落ちないように）。

import type { ClinicInfo, CountBlock, LessonRow, Roster, RosterEntry, StudentSheet, WeeklySlot } from "../types";
import { blankCount, blankRow, blankSheet, COUNT_BLOCK_SLOTS, isLessonType, nextMonth, normMonth } from "./rows";
import { newId } from "./id";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : fallback;

function normalizeRow(v: unknown): LessonRow {
  const base = blankRow();
  if (!isObj(v)) return base;
  return {
    m: str(v.m),
    d: str(v.d),
    type: isLessonType(v.type) ? v.type : base.type,
    start: str(v.start),
    end: str(v.end),
    subject: str(v.subject),
  };
}

function normalizeCount(v: unknown): CountBlock {
  if (!isObj(v)) return blankCount();
  return { subject: str(v.subject), 通常: str(v.通常), 持ち越し: str(v.持ち越し), 定期対策: str(v.定期対策) };
}

function normalizeSlot(v: unknown): WeeklySlot | null {
  if (!isObj(v)) return null;
  const wd = Number(v.weekday);
  return {
    weekday: Number.isInteger(wd) && wd >= 0 && wd <= 6 ? wd : 1,
    start: str(v.start),
    end: str(v.end),
    subject: str(v.subject),
  };
}

function rowsOrBlank(v: unknown): LessonRow[] {
  return Array.isArray(v) && v.length ? v.map(normalizeRow) : [blankRow()];
}

export function normalizeClinic(v: unknown): ClinicInfo {
  const o = isObj(v) ? v : {};
  return { clinicName: str(o.clinicName), manager: str(o.manager), tel: str(o.tel) };
}

export function normalizeSheet(v: unknown): StudentSheet {
  const base = blankSheet();
  if (!isObj(v)) return base;
  const blocks = Array.isArray(v.countBlocks) ? v.countBlocks.map(normalizeCount) : [];
  while (blocks.length < COUNT_BLOCK_SLOTS) blocks.push(blankCount());
  const month = normMonth(str(v.month));
  return {
    month,
    // 試作HTMLのJSONや旧データには無いので、無ければ対象月の翌月
    planMonth: typeof v.planMonth === "string" ? normMonth(v.planMonth) : nextMonth(month),
    student: str(v.student),
    teacher: str(v.teacher),
    dept: str(v.dept, base.dept),
    submitDate: str(v.submitDate, base.submitDate),
    doneRows: rowsOrBlank(v.doneRows),
    planRows: rowsOrBlank(v.planRows),
    countBlocks: blocks,
    schedule: Array.isArray(v.schedule) ? v.schedule.map(normalizeSlot).filter((s): s is WeeklySlot => s !== null) : [],
  };
}

export function newEntry(sheet: StudentSheet = blankSheet()): RosterEntry {
  return { id: newId(), sheet, updatedAt: new Date().toISOString() };
}

export function emptyRoster(): Roster {
  const first = newEntry();
  return { version: 1, clinic: normalizeClinic({}), entries: [first], activeId: first.id };
}

/** 保存済みロスターの復元。形が違えば null（呼び出し側で扱いを決める） */
export function normalizeRoster(v: unknown): Roster | null {
  if (!isObj(v) || v.version !== 1 || !Array.isArray(v.entries)) return null;
  const seen = new Set<string>();
  const entries: RosterEntry[] = [];
  for (const e of v.entries) {
    if (!isObj(e)) continue;
    let id = str(e.id);
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    entries.push({ id, sheet: normalizeSheet(e.sheet), updatedAt: str(e.updatedAt, new Date().toISOString()) });
  }
  if (!entries.length) entries.push(newEntry());
  const activeId = entries.some((e) => e.id === v.activeId) ? (v.activeId as string) : entries[0].id;
  return { version: 1, clinic: normalizeClinic(v.clinic), entries, activeId };
}
