import type { ClinicInfo, RosterEntry } from "../../types";
import { CountSheet } from "./CountSheet";
import { DoneSheet, PlanSheet } from "./Sheets";

export type PrintJob = { kind: "count" | "pair"; ids: string[] };

/**
 * まとめて印刷用。画面には出さず、印刷時だけ表示される（sheet.css）。
 * 実施＋予定：1人2ページ（表＝実施・裏＝予定）。
 * 回数報告書：1人1ページ＋白紙の裏。コピー機が両面設定のままでも1人1枚になる。
 */
export function BatchPrint({ job, entries, clinic }: { job: PrintJob; entries: RosterEntry[]; clinic: ClinicInfo }) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const targets = job.ids.map((id) => byId.get(id)).filter((e): e is RosterEntry => !!e);
  return (
    <div className="batch">
      {targets.map((e, i) =>
        job.kind === "pair" ? (
          <div key={e.id} className="batch-item">
            <DoneSheet active sheet={e.sheet} clinic={clinic} />
            <PlanSheet active sheet={e.sheet} clinic={clinic} />
          </div>
        ) : (
          <div key={e.id} className="batch-item">
            <CountSheet active sheet={e.sheet} clinic={clinic} />
            {i < targets.length - 1 && <div className="sheet blank-back" aria-hidden />}
          </div>
        ),
      )}
    </div>
  );
}
