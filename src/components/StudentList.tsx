import type { RosterEntry } from "../types";
import { studentName, studentStatus, teacherOf, teacherOptions } from "../lib/students";

type Props = {
  entries: RosterEntry[]; // 全員（絞り込みの選択肢用）
  visible: RosterEntry[]; // 絞り込み後・表示順
  teacher: string;
  onTeacher: (t: string) => void;
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onPrintCount: () => void;
  onPrintPair: () => void;
  onAdvance: () => void;
  onSend: () => void;
  onImport: () => void;
};

/** 担当生徒の一覧。入力状況を見渡し、まとめて印刷・月替わりを行う */
export function StudentList(p: Props) {
  const chosen = p.visible.filter((e) => p.selected.has(e.id));
  const allOn = p.visible.length > 0 && chosen.length === p.visible.length;
  const n = chosen.length;

  return (
    <section className="list-view">
      <div className="list-tools">
        <label htmlFor="teacher-filter">講師</label>
        <select id="teacher-filter" value={p.teacher} onChange={(e) => p.onTeacher(e.target.value)}>
          <option value="">全員</option>
          {teacherOptions(p.entries).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="muted">{p.visible.length}人</span>
        <button type="button" className="btn ghost" onClick={p.onAdd}>
          ＋ 生徒を追加
        </button>
      </div>

      <div className="table-scroll">
        <table className="students">
          <thead>
            <tr>
              <th className="chk">
                <input
                  type="checkbox"
                  aria-label="全員を選択"
                  checked={allOn}
                  onChange={(e) => p.onToggleAll(e.target.checked)}
                />
              </th>
              <th>生徒名</th>
              <th>講師</th>
              <th>対象月</th>
              <th>回数報告書</th>
              <th>実施</th>
              <th>予定</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {p.visible.map((e) => {
              const st = studentStatus(e.sheet);
              return (
                <tr key={e.id} className={st.warnings.length ? "has-warn" : undefined}>
                  <td className="chk">
                    <input
                      type="checkbox"
                      aria-label={`${studentName(e.sheet)}を選択`}
                      checked={p.selected.has(e.id)}
                      onChange={(ev) => p.onToggle(e.id, ev.target.checked)}
                    />
                  </td>
                  <td>
                    <button type="button" className="linkbtn" onClick={() => p.onOpen(e.id)}>
                      {studentName(e.sheet)}
                    </button>
                  </td>
                  <td>{teacherOf(e.sheet)}</td>
                  <td>{e.sheet.month ? `${e.sheet.month}月` : <span className="warn-text">未入力</span>}</td>
                  <td>{st.countFilled ? "入力済" : <span className="muted">未入力</span>}</td>
                  <td>{st.done}回</td>
                  <td>{st.plan}回</td>
                  <td>
                    {st.warnings.length ? (
                      <details className="warns">
                        <summary className="warn-text">⚠ {st.warnings.length}件</summary>
                        <ul>
                          {st.warnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <span className="ok-text">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {p.visible.length === 0 && (
              <tr>
                <td colSpan={8} className="muted empty-row">
                  該当する生徒がいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="list-actions">
        <div className="group">
          <b>まとめて印刷（選択中 {n}人）</b>
          <button type="button" className="btn primary" disabled={!n} onClick={p.onPrintCount}>
            回数報告書を印刷
          </button>
          <button type="button" className="btn primary" disabled={!n} onClick={p.onPrintPair}>
            実施＋予定を印刷
          </button>
          <small>
            実施＋予定は1人2ページ（表＝実施・裏＝予定）。回数報告書は白紙の裏を自動で挟むので、どちらも
            <b>両面・長辺とじ</b>のままで1人1枚になります。
          </small>
        </div>
        <div className="group">
          <b>受け渡し（講師のスマホ → 集約役のPC）</b>
          <button type="button" className="btn primary" disabled={!n} onClick={p.onSend}>
            選択中の{n}人を送る
          </button>
          <button type="button" className="btn ghost" onClick={p.onImport}>
            送られてきたファイルを読み込む
          </button>
          <small>
            「送る」で1つのファイルにまとめ、LINE・メールなどで集約役に渡します。集約役は「読み込む」で取り込み、上の「まとめて印刷」で印刷します。
          </small>
        </div>
        <div className="group">
          <b>月替わり</b>
          <button type="button" className="btn" disabled={!n} onClick={p.onAdvance}>
            選択中の{n}人を翌月へ進める
          </button>
          <small>
            対象月を＋1し、授業予定を実施報告書に移します（予定は空に、回数報告書は科目だけ残します）。実行前に全体バックアップを書き出します。
          </small>
        </div>
      </div>
    </section>
  );
}
