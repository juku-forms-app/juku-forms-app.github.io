import type { ChangeEvent, Dispatch } from "react";
import type { CountBlock, StudentSheet } from "../../types";
import type { Action } from "../../state/rosterReducer";

const COUNT_FIELDS = ["通常", "持ち越し", "定期対策"] as const;

export function CountEditor({ sheet, dispatch }: { sheet: StudentSheet; dispatch: Dispatch<Action> }) {
  const set = (index: number, field: keyof CountBlock) => (e: ChangeEvent<HTMLInputElement>) =>
    dispatch({ type: "setCount", index, field, value: e.target.value });

  return (
    <>
      <h2 className="sec">回数報告書（月初の想定回数）</h2>
      <div className="note">
        月初に出す「今月これくらい」の想定回数です。実施報告書とは別に手入力します（実績とズレてもOK）。生徒署名欄は印刷後に記入。
      </div>
      <div className="field">
        <label htmlFor="m-dept">部門（見出し）</label>
        <input
          id="m-dept"
          type="text"
          placeholder="中等部"
          value={sheet.dept}
          onChange={(e) => dispatch({ type: "setMeta", key: "dept", value: e.target.value })}
        />
      </div>
      {sheet.countBlocks.map((b, i) => (
        <div className="cblock" key={i}>
          <div className="subjrow">
            <span className="cap">科目</span>
            <input
              className="csubj"
              type="text"
              placeholder="英語 / 数学 …"
              aria-label={`${i + 1}枠目 科目`}
              value={b.subject}
              onChange={set(i, "subject")}
            />
          </div>
          <div className="cnts">
            {COUNT_FIELDS.map((f) => (
              <div className="c" key={f}>
                <label htmlFor={`cnt-${i}-${f}`}>{f}</label>
                <input id={`cnt-${i}-${f}`} type="number" min={0} value={b[f]} onChange={set(i, f)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
