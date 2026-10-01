import type { LessonRow } from "../types";
import { MAX_ROWS_PER_PAGE, rowFilled } from "./rows";

export type ValidationTarget = { rows: LessonRow[]; label: string };

/** 印刷前チェック。空行は無視し、入力のある行だけ見る */
export function validateRows(targets: ValidationTarget[]): string[] {
  const warnings: string[] = [];
  for (const { rows, label } of targets) {
    // 未入力の行も空欄として印刷されるので、行数はそのまま数える
    if (rows.length > MAX_ROWS_PER_PAGE) {
      warnings.push(`${label}：${rows.length}行あり1ページに収まりません（最大${MAX_ROWS_PER_PAGE}行）。不要な行を削除してください`);
    }
    rows.forEach((r, i) => {
      if (!rowFilled(r)) return;
      const at = `${label} ${i + 1}行目`;
      if (!r.m || !r.d) warnings.push(`${at}：日付が未入力`);
      // "HH:MM" 同士は文字列比較で前後が判定できる
      if (r.start && r.end && r.start >= r.end) warnings.push(`${at}：終了が開始より前`);
    });
  }
  return warnings;
}
