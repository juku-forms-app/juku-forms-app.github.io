import type { ChangeEvent, Dispatch } from "react";
import { LESSON_TYPES, type LessonRow, type RowsKey } from "../../types";
import type { Action } from "../../state/rosterReducer";
import { lessonCount, MAX_ROWS_PER_PAGE } from "../../lib/rows";
import { validateRows } from "../../lib/validate";
import { useDialog } from "../Dialog";

const LABEL: Record<RowsKey, string> = { doneRows: "実施報告書", planRows: "授業予定" };
const TITLE: Record<RowsKey, string> = { doneRows: "実施した授業（実績）", planRows: "予定の授業" };

type Props = { list: RowsKey; rows: LessonRow[]; otherRows: LessonRow[]; dispatch: Dispatch<Action> };

export function LessonRowsEditor({ list, rows, otherRows, dispatch }: Props) {
  const other: RowsKey = list === "doneRows" ? "planRows" : "doneRows";
  const dialog = useDialog();

  const copyFromOther = async () => {
    if (lessonCount(otherRows) === 0) {
      await dialog.alert(`${LABEL[other]}に入力がありません。`);
      return;
    }
    if (
      lessonCount(rows) > 0 &&
      !(await dialog.confirm("今の入力を上書きしてコピーします。よろしいですか？", { ok: "上書きしてコピー" }))
    )
      return;
    dispatch({ type: "copyRows", from: other, to: list });
  };

  return (
    <>
      <h2 className="sec">{TITLE[list]}</h2>
      <div className="copybar">
        <button type="button" className="btn ghost" onClick={copyFromOther}>
          {LABEL[other]}からコピー
        </button>
        <span className="tally">入力済み {lessonCount(rows)} 回</span>
      </div>
      {rows.length > MAX_ROWS_PER_PAGE && (
        <div className="note warn">
          ⚠ {rows.length}行あり、印刷すると1ページに収まりません（最大{MAX_ROWS_PER_PAGE}
          行）。不要な行を削除してください。
        </div>
      )}
      <div className="note">
        1行入れて「複製」→ 日付だけ変える、が速いです。予定と実施が同じなら上のコピーで丸ごと写せます。
      </div>
      <div className="rows">
        {rows.map((r, i) => (
          <RowCard key={i} list={list} row={r} index={i} dispatch={dispatch} />
        ))}
      </div>
      <button type="button" className="btn addrow" onClick={() => dispatch({ type: "addRow", list })}>
        ＋ 空の行を追加
      </button>
    </>
  );
}

function RowCard({
  list,
  row,
  index,
  dispatch,
}: {
  list: RowsKey;
  row: LessonRow;
  index: number;
  dispatch: Dispatch<Action>;
}) {
  const bind = (field: keyof LessonRow) => ({
    value: row[field],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      dispatch({ type: "setRow", list, index, field, value: e.target.value }),
  });
  // 印刷前と同じ基準で、その場でも行ごとに気づけるようにする
  const warnings = validateRows([{ rows: [row], label: "" }]).map((w) => w.replace(/^.*：/, ""));
  const n = index + 1;

  return (
    <div className={`rowcard${warnings.length ? " invalid" : ""}`}>
      <span className="no">{n}</span>
      <button
        type="button"
        className="rm"
        title="削除"
        aria-label={`${n}行目を削除`}
        onClick={() => dispatch({ type: "removeRow", list, index })}
      >
        ×
      </button>
      <div className="mini">
        <div>
          <span className="cap">日付</span>
          <div className="date-in">
            <input type="number" min={1} max={12} aria-label={`${n}行目 月`} {...bind("m")} /> 月
            <input type="number" min={1} max={31} aria-label={`${n}行目 日`} {...bind("d")} /> 日
          </div>
        </div>
        <div>
          <span className="cap">授業の種類</span>
          <select className="type-sel" aria-label={`${n}行目 授業の種類`} {...bind("type")}>
            {LESSON_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="full">
          <span className="cap">時間帯</span>
          <div className="time-in">
            <input type="time" aria-label={`${n}行目 開始`} {...bind("start")} />
            <span>〜</span>
            <input type="time" aria-label={`${n}行目 終了`} {...bind("end")} />
          </div>
        </div>
        <div className="full">
          <span className="cap">授業科目</span>
          <input
            className="subj"
            type="text"
            placeholder="英語 / 数学 …"
            aria-label={`${n}行目 授業科目`}
            {...bind("subject")}
          />
        </div>
      </div>
      {warnings.length > 0 && <div className="rowwarn">⚠ {warnings.join(" ／ ")}</div>}
      <div className="cardfoot">
        <button type="button" className="dup" onClick={() => dispatch({ type: "duplicateRow", list, index })}>
          ＋この行を複製（日付以外をコピー）
        </button>
      </div>
    </div>
  );
}
