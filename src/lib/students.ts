// 生徒一覧・まとめて印刷・月替わりのためのロジック（画面から切り離してテストする）

import type { RosterEntry, StudentSheet } from "../types";
import { blankRow, cloneRows, lessonCount, MAX_ROWS_PER_PAGE, nextMonth } from "./rows";
import { validateRows } from "./validate";

export const NO_TEACHER = "（講師未入力）";

export function teacherOf(sheet: StudentSheet): string {
  return sheet.teacher.trim() || NO_TEACHER;
}

export function studentName(sheet: StudentSheet): string {
  return sheet.student.trim() || "（名前未入力）";
}

/** 絞り込みの選択肢：登録されている講師名（重複なし・五十音順） */
export function teacherOptions(entries: RosterEntry[]): string[] {
  return [...new Set(entries.map((e) => teacherOf(e.sheet)))].sort((a, b) => a.localeCompare(b, "ja"));
}

/** 一覧の表示順（＝まとめて印刷の順）：講師名 → 生徒名 */
export function sortEntries(entries: RosterEntry[]): RosterEntry[] {
  return [...entries].sort(
    (a, b) =>
      teacherOf(a.sheet).localeCompare(teacherOf(b.sheet), "ja") ||
      studentName(a.sheet).localeCompare(studentName(b.sheet), "ja"),
  );
}

export function filterByTeacher(entries: RosterEntry[], teacher: string): RosterEntry[] {
  return teacher ? entries.filter((e) => teacherOf(e.sheet) === teacher) : entries;
}

export function countFilled(sheet: StudentSheet): boolean {
  return sheet.countBlocks.some((b) => b.subject.trim() || b.通常 || b.持ち越し || b.定期対策);
}

export function pairWarnings(sheet: StudentSheet): string[] {
  return validateRows([
    { rows: sheet.doneRows, label: "実施報告書" },
    { rows: sheet.planRows, label: "授業予定" },
  ]);
}

export type StudentStatus = {
  countFilled: boolean;
  done: number;
  plan: number;
  warnings: string[];
  overflow: boolean; // 1ページに収まらない（両面の表裏がずれる）
};

export function studentStatus(sheet: StudentSheet): StudentStatus {
  return {
    countFilled: countFilled(sheet),
    done: lessonCount(sheet.doneRows),
    plan: lessonCount(sheet.planRows),
    warnings: pairWarnings(sheet),
    overflow: sheet.doneRows.length > MAX_ROWS_PER_PAGE || sheet.planRows.length > MAX_ROWS_PER_PAGE,
  };
}

/**
 * 月替わり：対象月を翌月にし、先月の授業予定を今月の実施報告書のたたき台に移す。
 * 授業予定は空に、回数報告書は科目だけ残して回数を空に、提出日は今日にする。
 * 対象月が読めない場合は null（進められない）。
 */
export function advanceSheet(sheet: StudentSheet, today: string): StudentSheet | null {
  const month = nextMonth(sheet.month);
  if (!month) return null;
  return {
    ...sheet,
    month,
    planMonth: nextMonth(month),
    submitDate: today,
    doneRows: lessonCount(sheet.planRows) ? cloneRows(sheet.planRows) : Array.from({ length: 6 }, blankRow),
    planRows: Array.from({ length: 6 }, blankRow),
    countBlocks: sheet.countBlocks.map((b) => ({ subject: b.subject, 通常: "", 持ち越し: "", 定期対策: "" })),
  };
}
