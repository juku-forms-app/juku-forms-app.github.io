import type { ChangeEvent, Dispatch } from "react";
import type { ClinicInfo, StudentSheet, Tab } from "../../types";
import type { Action } from "../../state/rosterReducer";
import { nextMonth } from "../../lib/rows";

type Props = { tab: Tab; sheet: StudentSheet; clinic: ClinicInfo; dispatch: Dispatch<Action> };

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function MonthSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  // 一覧に無い値（手で書き換えた古いデータなど）も消えないよう選択肢に残す
  const options = value && !MONTHS.includes(value) ? [value, ...MONTHS] : MONTHS;
  return (
    <div className="date-in">
      <select id={id} className="month-sel" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">－</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>{" "}
      月
    </div>
  );
}

export function MetaForm({ tab, sheet, clinic, dispatch }: Props) {
  const meta = (key: "student" | "teacher" | "submitDate") => ({
    value: sheet[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => dispatch({ type: "setMeta", key, value: e.target.value }),
  });
  const clin = (key: keyof ClinicInfo) => ({
    value: clinic[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => dispatch({ type: "setClinic", key, value: e.target.value }),
  });

  return (
    <>
      <h2>基本情報（3枚共通）</h2>
      <div className="meta-grid">
        {tab === "plan" ? (
          <div className="field">
            <label htmlFor="m-month">対象月（授業予定）</label>
            <MonthSelect
              id="m-month"
              value={sheet.planMonth}
              onChange={(v) => dispatch({ type: "setMeta", key: "planMonth", value: v })}
            />
            <small className="hint-inline">
              {sheet.month ? `初期値は実施報告書（${sheet.month}月）の翌月` : "初期値は実施報告書の月の翌月"}
            </small>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="m-month">対象月</label>
            <MonthSelect
              id="m-month"
              value={sheet.month}
              onChange={(v) => dispatch({ type: "setMeta", key: "month", value: v })}
            />
            {sheet.planMonth && sheet.planMonth !== nextMonth(sheet.month) && (
              <small className="hint-inline">授業予定は {sheet.planMonth}月（手動で変更済み）</small>
            )}
          </div>
        )}
        <div className="field">
          <label htmlFor="m-student">生徒名</label>
          <input id="m-student" type="text" placeholder="山田 太郎" {...meta("student")} />
        </div>
        <div className="field full">
          <label htmlFor="m-teacher">講師名</label>
          <input id="m-teacher" type="text" placeholder="近大 花子" {...meta("teacher")} />
        </div>
      </div>
      <details className="settings">
        <summary>塾情報・提出日（各紙の右上に印刷 ／ 一度入れれば全部に反映）</summary>
        <div className="body">
          <div className="field">
            <label htmlFor="s-date">提出日</label>
            <input id="s-date" type="date" {...meta("submitDate")} />
          </div>
          <p className="shared">以下の塾情報は全生徒で共通です。</p>
          <div className="field">
            <label htmlFor="s-clinic">塾名</label>
            <input id="s-clinic" type="text" placeholder="例）○○塾 △△校" {...clin("clinicName")} />
          </div>
          <div className="field">
            <label htmlFor="s-manager">責任者名</label>
            <input id="s-manager" type="text" placeholder="例）教室 太郎" {...clin("manager")} />
          </div>
          <div className="field">
            <label htmlFor="s-tel">電話番号</label>
            <input id="s-tel" type="text" placeholder="例）06-0000-0000" {...clin("tel")} />
          </div>
        </div>
      </details>
    </>
  );
}
