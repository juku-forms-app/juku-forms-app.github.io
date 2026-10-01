import type { ClinicInfo, CountBlock, StudentSheet } from "../../types";
import { blankCount, COUNT_BLOCK_SLOTS } from "../../lib/rows";
import { ClinicHead } from "./ClinicHead";

function CntLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="cntline">
      <span className="lab">{label}</span>
      <span className="num">{value}</span>
      <span className="unit">回</span>
    </div>
  );
}

/** 回数報告書（A4縦・1枚）。科目は5枠固定 */
export function CountSheet({ active, sheet, clinic }: { active: boolean; sheet: StudentSheet; clinic: ClinicInfo }) {
  const blocks: CountBlock[] = sheet.countBlocks.slice(0, COUNT_BLOCK_SLOTS);
  while (blocks.length < COUNT_BLOCK_SLOTS) blocks.push(blankCount());
  return (
    <div className={`sheet sheet-count${active ? " active" : ""}`}>
      <ClinicHead clinic={clinic} submitDate={sheet.submitDate} />
      <div className="doctitle" style={{ marginTop: "8mm" }}>
        {sheet.dept}
        <span className="mon">{sheet.month}</span> 月度　授業回数報告書
      </div>
      <table className="count">
        <colgroup>
          <col className="k-subj" />
          <col className="k-cnt" />
          <col className="k-sign" />
        </colgroup>
        <thead>
          <tr>
            <th>科目</th>
            <th>授業回数</th>
            <th>生徒署名欄</th>
          </tr>
        </thead>
        <tbody>
          {blocks.flatMap((b, i) => [
            <tr key={`${i}-a`}>
              <td className="subjcell" rowSpan={3}>
                {b.subject}
              </td>
              <td className="cntcell">
                <CntLine label="通常" value={b.通常} />
              </td>
              <td rowSpan={3}></td>
            </tr>,
            <tr key={`${i}-b`}>
              <td className="cntcell">
                <CntLine label="持ち越し" value={b.持ち越し} />
              </td>
            </tr>,
            <tr key={`${i}-c`}>
              <td className="cntcell">
                <CntLine label="定期対策" value={b.定期対策} />
              </td>
            </tr>,
          ])}
        </tbody>
      </table>
      <div className="foot" style={{ marginTop: "8mm" }}>
        <p>※　授業に遅刻または欠席をされる場合は、必ず担当講師まで連絡をお願いします。</p>
      </div>
    </div>
  );
}
