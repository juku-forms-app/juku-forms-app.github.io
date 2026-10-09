// いつもの授業（曜日・時間）から授業予定の行を作る

import type { LessonRow, WeeklySlot } from "../types";

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function blankSlot(): WeeklySlot {
  return { weekday: 1, start: "", end: "", subject: "" };
}

/** 追加しただけで何も入れていないコマは使わない */
export function usableSlots(schedule: WeeklySlot[]): WeeklySlot[] {
  return schedule.filter((s) => s.start || s.end || s.subject.trim());
}

/** 帳票は月しか持たないので、年は「今日に一番近い年」とする（12月に作る1月の予定 → 翌年） */
export function inferYear(month: number, today: Date): number {
  const y = today.getFullYear();
  const dist = (year: number) => Math.abs(new Date(year, month - 1, 15).getTime() - today.getTime());
  return [y - 1, y, y + 1].reduce((best, c) => (dist(c) < dist(best) ? c : best));
}

/** その月の該当曜日をすべて行にする。日付順、同じ日は開始時刻順。月が読めなければ空 */
export function generatePlanRows(schedule: WeeklySlot[], month: string, today: Date): LessonRow[] {
  const m = Number(month.trim());
  if (!Number.isInteger(m) || m < 1 || m > 12) return [];
  const slots = usableSlots(schedule);
  if (!slots.length) return [];
  const year = inferYear(m, today);
  const days = new Date(year, m, 0).getDate();
  const rows: { day: number; row: LessonRow }[] = [];
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, m - 1, d).getDay();
    for (const s of slots) {
      if (s.weekday !== wd) continue;
      rows.push({
        day: d,
        row: { m: String(m), d: String(d), type: "通常", start: s.start, end: s.end, subject: s.subject },
      });
    }
  }
  return rows.sort((a, b) => a.day - b.day || a.row.start.localeCompare(b.row.start)).map((x) => x.row);
}

/** "YYYY-MM-DD" を端末の日付として読む（UTC解釈で日付がずれないように） */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}
