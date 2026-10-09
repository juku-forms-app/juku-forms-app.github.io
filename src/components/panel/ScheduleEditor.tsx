import { useState, type Dispatch } from "react";
import type { StudentSheet, WeeklySlot } from "../../types";
import type { Action } from "../../state/rosterReducer";
import { lessonCount, todayISO } from "../../lib/rows";
import { usableSlots, WEEKDAYS } from "../../lib/schedule";
import { useDialog } from "../Dialog";

/** いつもの授業（曜日・時間）の登録と、そこから授業予定を作るボタン */
export function ScheduleEditor({ sheet, dispatch }: { sheet: StudentSheet; dispatch: Dispatch<Action> }) {
  const dialog = useDialog();
  const set = (index: number, field: keyof WeeklySlot, value: string) =>
    dispatch({ type: "setSlot", index, field, value });
  const month = sheet.planMonth.trim();
  // 未登録なら開いて見せ、登録済みなら畳んでおく（生徒を切り替えると入力パネルごと作り直されるので、そのときに決め直す）
  const [initiallyOpen] = useState(() => sheet.schedule.length === 0);

  const fill = async () => {
    if (!month) {
      await dialog.alert("先に授業予定の月を選んでください。");
      return;
    }
    if (!usableSlots(sheet.schedule).length) {
      await dialog.alert("いつもの授業を1つ以上入れてください。");
      return;
    }
    if (
      lessonCount(sheet.planRows) > 0 &&
      !(await dialog.confirm(`今の授業予定を消して、いつもの授業から${month}月の予定を作り直します。よろしいですか？`, {
        ok: "作り直す",
      }))
    )
      return;
    dispatch({ type: "fillPlanFromSchedule", today: todayISO() });
  };

  return (
    <details className="settings schedule" open={initiallyOpen}>
      <summary>いつもの授業（曜日・時間）{sheet.schedule.length ? `：${sheet.schedule.length}コマ` : ""}</summary>
      <div className="body">
        <p className="shared">
          毎週の決まったコマを登録すると、授業予定をその月の曜日で自動で埋めます（「翌月へ進める」でも自動）。休みや振替はあとで行ごとに直してください。
        </p>
        {sheet.schedule.map((s, i) => (
          <div className="slot" key={i}>
            <select
              aria-label={`${i + 1}コマ目 曜日`}
              value={s.weekday}
              onChange={(e) => set(i, "weekday", e.target.value)}
            >
              {WEEKDAYS.map((w, wd) => (
                <option key={w} value={wd}>
                  {w}曜
                </option>
              ))}
            </select>
            <input
              type="time"
              aria-label={`${i + 1}コマ目 開始`}
              value={s.start}
              onChange={(e) => set(i, "start", e.target.value)}
            />
            <span>〜</span>
            <input
              type="time"
              aria-label={`${i + 1}コマ目 終了`}
              value={s.end}
              onChange={(e) => set(i, "end", e.target.value)}
            />
            <input
              type="text"
              className="slot-subj"
              placeholder="科目"
              aria-label={`${i + 1}コマ目 科目`}
              value={s.subject}
              onChange={(e) => set(i, "subject", e.target.value)}
            />
            <button
              type="button"
              className="rm-slot"
              aria-label={`${i + 1}コマ目を削除`}
              onClick={() => dispatch({ type: "removeSlot", index: i })}
            >
              ×
            </button>
          </div>
        ))}
        <div className="slot-actions">
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: "addSlot" })}>
            ＋ コマを追加
          </button>
          <button type="button" className="btn primary" onClick={fill} disabled={!sheet.schedule.length}>
            この内容で{month || "－"}月の予定を作る
          </button>
        </div>
      </div>
    </details>
  );
}
