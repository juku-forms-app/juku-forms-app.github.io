// JSON 書き出し／読み込み。暫定運用（講師→集約役へのファイル受け渡し）のため常に維持する。
// 生徒1人分は試作HTMLと同じ SheetData 形式。全体バックアップはロスターをそのまま包む。

import type { ClinicInfo, Roster, RosterEntry, SheetData, StudentSheet } from "../types";
import { normalizeClinic, normalizeRoster, normalizeSheet } from "./normalize";
import { todayISO } from "./rows";

const BACKUP_KIND = "juku-form-app/roster-backup";
const BUNDLE_KIND = "juku-form-app/students";

export function toSheetData(sheet: StudentSheet, clinic: ClinicInfo): SheetData {
  return { ...sheet, ...clinic };
}

export function sheetFileName(sheet: StudentSheet): string {
  return `帳票_${sheet.student.trim() || "生徒"}_${sheet.month.trim()}月.json`;
}

export function exportSheetJSON(entry: RosterEntry, clinic: ClinicInfo): string {
  return JSON.stringify(toSheetData(entry.sheet, clinic), null, 2);
}

export function backupFileName(now = new Date()): string {
  return `帳票バックアップ_${todayISO(now)}.json`;
}

export function exportRosterJSON(roster: Roster): string {
  return JSON.stringify({ kind: BACKUP_KIND, exportedAt: new Date().toISOString(), roster }, null, 2);
}

/**
 * まとめて送る用：選んだ生徒の帳票を1ファイルに束ねる（講師のスマホ → 集約役のPC）。
 * 塾情報は含めない（受け取る側のPCの塾情報で印刷するため、送る必要がない）。
 */
export function exportBundleJSON(entries: RosterEntry[]): string {
  return JSON.stringify(
    { kind: BUNDLE_KIND, exportedAt: new Date().toISOString(), students: entries.map((e) => e.sheet) },
    null,
    2,
  );
}

export function bundleFileName(entries: RosterEntry[]): string {
  const teachers = new Set(entries.map((e) => e.sheet.teacher.trim() || "講師"));
  const months = new Set(entries.map((e) => e.sheet.month.trim()));
  const who = teachers.size === 1 ? [...teachers][0] : "複数講師";
  const month = teachers.size === 1 && months.size === 1 && [...months][0] ? `_${[...months][0]}月` : "";
  return `帳票_${who}${month}_${entries.length}人.json`;
}

const matchKey = (s: StudentSheet) => `${s.student.trim()}\u0000${s.teacher.trim()}`;

export type BundleImportPlan = { replace: { id: string; sheet: StudentSheet }[]; add: StudentSheet[] };

/** 束の読み込み方を決める：生徒名＋講師名が同じ生徒は上書き、いなければ追加（名前が空なら常に追加） */
export function planBundleImport(existing: RosterEntry[], sheets: StudentSheet[]): BundleImportPlan {
  const byKey = new Map<string, string>();
  for (const e of existing) if (e.sheet.student.trim()) byKey.set(matchKey(e.sheet), e.id);
  const plan: BundleImportPlan = { replace: [], add: [] };
  for (const sheet of sheets) {
    const id = sheet.student.trim() ? byKey.get(matchKey(sheet)) : undefined;
    if (id) plan.replace.push({ id, sheet });
    else plan.add.push(sheet);
  }
  return plan;
}

export type ImportResult =
  | { kind: "sheet"; sheet: StudentSheet; clinic: ClinicInfo }
  | { kind: "bundle"; sheets: StudentSheet[] }
  | { kind: "roster"; roster: Roster };

/** 読み込んだテキストを判定して整える。解釈できなければ Error を投げる */
export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSONとして読めませんでした。");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("帳票データの形式ではありません。");
  }
  const o = data as Record<string, unknown>;
  if (o.kind === BACKUP_KIND) {
    const roster = normalizeRoster(o.roster);
    if (!roster) throw new Error("バックアップファイルが壊れています。");
    return { kind: "roster", roster };
  }
  if (o.kind === BUNDLE_KIND) {
    if (!Array.isArray(o.students)) throw new Error("送られてきたファイルが壊れています。");
    return { kind: "bundle", sheets: o.students.map(normalizeSheet) };
  }
  const looksLikeSheet = ["doneRows", "planRows", "countBlocks", "student", "month"].some((k) => k in o);
  if (!looksLikeSheet) throw new Error("帳票データの形式ではありません。");
  return { kind: "sheet", sheet: normalizeSheet(o), clinic: normalizeClinic(o) };
}

/** 空欄だけ埋める（既に入っている教室の塾情報は読み込みで上書きしない） */
export function mergeClinicFillEmpty(current: ClinicInfo, incoming: ClinicInfo): ClinicInfo {
  return {
    clinicName: current.clinicName || incoming.clinicName,
    manager: current.manager || incoming.manager,
    tel: current.tel || incoming.tel,
  };
}

/**
 * スマホでは共有画面（LINE・メールなど）でファイルを渡す。共有できない環境ではファイルとして保存する。
 * 戻り値：共有した／保存した／キャンセルされた
 */
export async function shareOrDownload(text: string, fileName: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([text], fileName, { type: "application/json" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // それ以外の失敗（権限など）は保存に切り替える
    }
  }
  downloadText(text, fileName);
  return "downloaded";
}

export function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  // Safari はクリック直後に revoke するとダウンロードが失敗することがある
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
