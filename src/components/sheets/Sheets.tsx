import type { ClinicInfo, StudentSheet, Tab } from "../../types";
import { MIN_ROWS } from "../../lib/rows";
import { CountSheet } from "./CountSheet";
import { LessonSheet } from "./LessonSheet";

type SheetProps = { active: boolean; sheet: StudentSheet; clinic: ClinicInfo };

export function DoneSheet({ active, sheet, clinic }: SheetProps) {
  return (
    <LessonSheet
      kind="done"
      active={active}
      sheet={sheet}
      clinic={clinic}
      rows={sheet.doneRows}
      minRows={MIN_ROWS.doneRows}
      title={
        <>
          <span className="mon">{sheet.month}</span> 月分　実施報告書
        </>
      }
      foot={
        <>
          <p>※「授業の種類」における「振替(前月分)」は前月からの持ち越しです。</p>
          <p>　また、ご不明な点がございましたら、事務所にお問い合わせください。</p>
        </>
      }
    />
  );
}

export function PlanSheet({ active, sheet, clinic }: SheetProps) {
  return (
    <LessonSheet
      kind="plan"
      active={active}
      sheet={sheet}
      clinic={clinic}
      rows={sheet.planRows}
      minRows={MIN_ROWS.planRows}
      title={
        <>
          <span className="mon">{sheet.planMonth}</span> 月　授業予定
        </>
      }
      foot={<p>※　ご都合が合わない日程がありましたら、事務所にお問い合わせください。</p>}
    />
  );
}

/**
 * 1人分の3枚を描画し、画面では開いているタブの1枚だけ表示する。
 * 印刷時の出し分け（回数のみ／実施＋予定）は sheet.css が .app[data-tab] を見て行う。
 * 表裏が逆だった場合は DoneSheet と PlanSheet の順を入れ替える（BatchPrint も同様）。
 */
export function Sheets({ tab, sheet, clinic }: { tab: Tab; sheet: StudentSheet; clinic: ClinicInfo }) {
  return (
    <>
      <CountSheet active={tab === "count"} sheet={sheet} clinic={clinic} />
      <DoneSheet active={tab === "done"} sheet={sheet} clinic={clinic} />
      <PlanSheet active={tab === "plan"} sheet={sheet} clinic={clinic} />
    </>
  );
}
