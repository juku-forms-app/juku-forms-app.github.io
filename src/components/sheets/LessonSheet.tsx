import { Fragment, type ReactNode } from "react";
import { LESSON_TYPES, type ClinicInfo, type LessonRow, type LessonType, type StudentSheet } from "../../types";
import { rowFilled } from "../../lib/rows";
import { ClinicHead } from "./ClinicHead";

/** 「通常・定期対策・振替(前月分)」のうち選択されたものに手書き風の丸 */
function TypeLine({ selected }: { selected?: LessonType }) {
  return (
    <>
      {LESSON_TYPES.map((t, i) => (
        <Fragment key={t}>
          {i > 0 && "・"}
          {t === selected ? <span className="circled">{t}</span> : t}
        </Fragment>
      ))}
    </>
  );
}

type Props = {
  kind: "done" | "plan";
  active: boolean;
  sheet: StudentSheet;
  clinic: ClinicInfo;
  rows: LessonRow[];
  title: ReactNode;
  foot: ReactNode;
  minRows: number;
};

/** 実施報告書・授業予定の共通レイアウト（A4縦） */
export function LessonSheet({ kind, active, sheet, clinic, rows, title, foot, minRows }: Props) {
  const pad = Math.max(0, minRows - rows.length);
  // 未入力の行は「通常」に丸が付かないよう、空欄行と同じ見た目で出す
  const blank = (key: string) => (
    <tr className="empty" key={key}>
      <td>　月　　日</td>
      <td className="type-line">
        <TypeLine />
      </td>
      <td>　：　〜　：　</td>
      <td></td>
    </tr>
  );
  return (
    <div className={`sheet sheet-${kind}${active ? " active" : ""}`}>
      <ClinicHead clinic={clinic} submitDate={sheet.submitDate} />
      <div className="dept">個別指導部</div>
      <div className="doctitle">{title}</div>
      <div className="metarow">
        <div className="m">
          <span className="lb">生徒名</span>
          <span className="val">{sheet.student}</span>
        </div>
        <div className="m">
          <span className="lb">講師名</span>
          <span className="val">{sheet.teacher}</span>
        </div>
      </div>
      <table className="rep">
        <colgroup>
          <col className="c-date" />
          <col className="c-type" />
          <col className="c-time" />
          <col className="c-subj" />
        </colgroup>
        <thead>
          <tr>
            <th>日付</th>
            <th>授業の種類</th>
            <th>時間帯</th>
            <th>授業科目</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            !rowFilled(r) ? (
              blank(`row-${i}`)
            ) : (
            <tr key={`row-${i}`}>
              <td className="cell-date">
                <span>{r.m}</span> 月 <span>{r.d}</span> 日
              </td>
              <td className="type-line">
                <TypeLine selected={r.type} />
              </td>
              <td>
                <span className="time-cell">
                  {r.start}
                  <span className="sep">〜</span>
                  {r.end}
                </span>
              </td>
              <td>{r.subject}</td>
            </tr>
            ),
          )}
          {Array.from({ length: pad }, (_, i) => blank(`pad-${i}`))}
        </tbody>
      </table>
      <div className="foot">{foot}</div>
    </div>
  );
}
