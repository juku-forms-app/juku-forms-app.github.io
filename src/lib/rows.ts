import { LESSON_TYPES, type CountBlock, type LessonRow, type LessonType, type StudentSheet } from "../types";

export const COUNT_BLOCK_SLOTS = 5;
export const MIN_ROWS = { doneRows: 15, planRows: 11 } as const;
/** A4 1ページに収まる行数（試作の寸法で実測）。超えると2ページ目にはみ出し、両面の表裏がずれる */
export const MAX_ROWS_PER_PAGE = 16;

export function blankRow(): LessonRow {
  return { m: "", d: "", type: "通常", start: "", end: "", subject: "" };
}

export function blankCount(): CountBlock {
  return { subject: "", 通常: "", 持ち越し: "", 定期対策: "" };
}

export function todayISO(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 月（"1"〜"12"）の翌月。12月の次は1月。月として読めなければ空文字 */
export function nextMonth(month: string): string {
  const m = Number(month.trim());
  if (!Number.isInteger(m) || m < 1 || m > 12) return "";
  return String((m % 12) + 1);
}

/** "09" や " 9 " を "9" に揃える。月として読めなければそのまま返す */
export function normMonth(month: string): string {
  const m = Number(month.trim());
  return month.trim() !== "" && Number.isInteger(m) && m >= 1 && m <= 12 ? String(m) : month;
}

export function blankSheet(): StudentSheet {
  return {
    month: "",
    planMonth: "",
    student: "",
    teacher: "",
    dept: "中等部",
    submitDate: todayISO(),
    doneRows: Array.from({ length: 6 }, blankRow),
    planRows: Array.from({ length: 6 }, blankRow),
    countBlocks: Array.from({ length: COUNT_BLOCK_SLOTS }, blankCount),
    schedule: [],
  };
}

export function isLessonType(v: unknown): v is LessonType {
  return typeof v === "string" && (LESSON_TYPES as readonly string[]).includes(v);
}

/** 何か1つでも入力されている行か（種類を「通常」以外にしただけでも入力扱い） */
export function rowFilled(r: LessonRow): boolean {
  return Boolean(r.m || r.d || r.start || r.end || r.subject.trim() || r.type !== "通常");
}

export function lessonCount(rows: LessonRow[]): number {
  return rows.filter(rowFilled).length;
}

/** i 行目の直後に、日付だけ空にした複製を挿入する */
export function duplicateRow(rows: LessonRow[], i: number): LessonRow[] {
  const src = rows[i];
  if (!src) return rows;
  return [...rows.slice(0, i + 1), { ...src, m: "", d: "" }, ...rows.slice(i + 1)];
}

/** 行を削除する。最後の1行を消したら空行を1つ残す */
export function removeRow(rows: LessonRow[], i: number): LessonRow[] {
  const next = rows.filter((_, j) => j !== i);
  return next.length ? next : [blankRow()];
}

export function cloneRows(rows: LessonRow[]): LessonRow[] {
  return rows.map((r) => ({ ...r }));
}
