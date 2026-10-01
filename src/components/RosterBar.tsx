import type { Dispatch } from "react";
import type { Roster, StudentSheet } from "../types";
import type { Action } from "../state/rosterReducer";
import { useDialog } from "./Dialog";

export function entryLabel(sheet: StudentSheet): string {
  const name = sheet.student.trim() || "（名前未入力）";
  const month = sheet.month.trim() ? ` ／ ${sheet.month.trim()}月` : "";
  const teacher = sheet.teacher.trim() ? `（担当 ${sheet.teacher.trim()}）` : "";
  return `${name}${month}${teacher}`;
}

/** 生徒ロスター：共用PCで複数生徒を切り替える */
export function RosterBar({ roster, dispatch }: { roster: Roster; dispatch: Dispatch<Action> }) {
  const active = roster.entries.find((e) => e.id === roster.activeId);
  const dialog = useDialog();

  const remove = async () => {
    if (!active) return;
    const label = entryLabel(active.sheet);
    const ok = await dialog.confirm(
      `「${label}」をこのPCから削除します。元に戻せません。\n（必要なら先に「書き出す」でJSONを保存してください）`,
      { ok: "削除する", danger: true },
    );
    if (!ok) return;
    dispatch({ type: "removeStudent", id: active.id });
  };

  return (
    <div className="rosterbar no-print">
      <label htmlFor="roster-select">生徒</label>
      <select
        id="roster-select"
        value={roster.activeId}
        onChange={(e) => dispatch({ type: "selectStudent", id: e.target.value })}
      >
        {roster.entries.map((e) => (
          <option key={e.id} value={e.id}>
            {entryLabel(e.sheet)}
          </option>
        ))}
      </select>
      <button type="button" className="btn ghost" onClick={() => dispatch({ type: "addStudent" })}>
        ＋ 生徒を追加
      </button>
      <button type="button" className="btn danger" onClick={remove}>
        この生徒を削除
      </button>
      <span className="count">登録 {roster.entries.length} 人</span>
    </div>
  );
}
