import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Tab } from "./types";
import { useRoster } from "./state/useRoster";
import { activeEntry } from "./state/rosterReducer";
import { validateRows } from "./lib/validate";
import { newEntry } from "./lib/normalize";
import { blankSheet, nextMonth, todayISO } from "./lib/rows";
import { filterByTeacher, NO_TEACHER, sortEntries, studentName, studentStatus } from "./lib/students";
import {
  backupFileName,
  bundleFileName,
  exportBundleJSON,
  planBundleImport,
  shareOrDownload,
  downloadText,
  exportRosterJSON,
  exportSheetJSON,
  mergeClinicFillEmpty,
  parseImport,
  sheetFileName,
} from "./lib/jsonio";
import { RosterBar } from "./components/RosterBar";
import { MetaForm } from "./components/panel/MetaForm";
import { LessonRowsEditor } from "./components/panel/LessonRowsEditor";
import { CountEditor } from "./components/panel/CountEditor";
import { ScheduleEditor } from "./components/panel/ScheduleEditor";
import { Sheets } from "./components/sheets/Sheets";
import { BatchPrint, type PrintJob } from "./components/sheets/BatchPrint";
import { StudentList } from "./components/StudentList";
import { useDialog } from "./components/Dialog";
import { UpdateBanner } from "./components/UpdateBanner";

const TABS: { id: Tab; label: string }[] = [
  { id: "list", label: "生徒一覧" },
  { id: "count", label: "回数報告書" },
  { id: "done", label: "実施報告書" },
  { id: "plan", label: "授業予定" },
];

export default function App() {
  const { roster, dispatch, loadWarning, dismissLoadWarning, saveError, externalChange } = useRoster();
  const dialog = useDialog();
  const [tab, setTab] = useState<Tab>("list");
  const [teacher, setTeacher] = useState(""); // 絞り込み（""＝全員）。共用PCなので保存しない
  // チェックを外した生徒だけ覚える（新しく追加した生徒は最初から選択状態にするため）
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  // 狭い画面（スマホ）では A4 プレビューを畳んでおく。広い画面では常に表示（CSS 側で切替）
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const entry = activeEntry(roster);
  const { sheet } = entry;
  const isCount = tab === "count";
  const isList = tab === "list";

  const visible = useMemo(() => sortEntries(filterByTeacher(roster.entries, teacher)), [roster.entries, teacher]);
  const selected = useMemo(
    () => new Set(visible.filter((e) => !excluded.has(e.id)).map((e) => e.id)),
    [visible, excluded],
  );
  const chosen = visible.filter((e) => selected.has(e.id));

  // まとめて印刷：印刷用のシート群を描画してから印刷ダイアログを開き、閉じたら片付ける
  useEffect(() => {
    if (!printJob) return;
    const done = () => setPrintJob(null);
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printJob]);

  const toggle = (id: string, on: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (on: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const e of visible) {
        if (on) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });

  const openStudent = (id: string) => {
    dispatch({ type: "selectStudent", id });
    setTab("done");
  };

  const addFromList = () => {
    const sheet = blankSheet();
    if (teacher && teacher !== NO_TEACHER) sheet.teacher = teacher;
    sheet.month = visible[0]?.sheet.month ?? "";
    dispatch({ type: "addStudent", entry: newEntry(sheet) });
    setTab("done");
  };

  const printBatch = async (kind: PrintJob["kind"]) => {
    if (kind === "pair") {
      const overflow = chosen.filter((e) => studentStatus(e.sheet).overflow);
      if (overflow.length) {
        await dialog.alert(
          `次の生徒は行数が多く1ページに収まりません。表裏がずれるので、行を減らしてから印刷してください：\n\n${overflow
            .map((e) => `・${studentName(e.sheet)}`)
            .join("\n")}`,
        );
        return;
      }
      const warns = chosen.flatMap((e) =>
        studentStatus(e.sheet).warnings.map((w) => `・${studentName(e.sheet)}：${w}`),
      );
      if (
        warns.length &&
        !(await dialog.confirm(`入力に気になる点があります：\n\n${warns.join("\n")}\n\nこのまま印刷しますか？`))
      )
        return;
    } else {
      const empty = chosen.filter((e) => !studentStatus(e.sheet).countFilled);
      if (
        empty.length &&
        !(await dialog.confirm(
          `回数報告書が未入力の生徒がいます（空欄のまま印刷されます）：\n\n${empty
            .map((e) => `・${studentName(e.sheet)}`)
            .join("\n")}\n\nこのまま印刷しますか？`,
        ))
      )
        return;
    }
    setPrintJob({ kind, ids: chosen.map((e) => e.id) });
  };

  const advance = async () => {
    const invalid = chosen.filter((e) => !nextMonth(e.sheet.month));
    const ok = chosen.length - invalid.length;
    if (!ok) {
      await dialog.alert("対象月が入力されていないため、進められる生徒がいません。");
      return;
    }
    const skip = invalid.length
      ? `\n\n※ 対象月が未入力のため進めない生徒：\n${invalid.map((e) => `・${studentName(e.sheet)}`).join("\n")}`
      : "";
    if (
      !(await dialog.confirm(
        `選択中の${ok}人を翌月へ進めます。\n\n・対象月を＋1\n・授業予定 → 実施報告書に移す\n・授業予定は空に、回数報告書は科目だけ残す\n\n今月分は上書きされるので、先に全体バックアップを書き出します。${skip}\n\n進めますか？`,
        { ok: "翌月へ進める", danger: true },
      ))
    )
      return;
    downloadText(exportRosterJSON(roster), backupFileName());
    dispatch({ type: "advanceMonth", ids: chosen.map((e) => e.id), today: todayISO() });
  };

  const send = async () => {
    const res = await shareOrDownload(exportBundleJSON(chosen), bundleFileName(chosen));
    if (res === "downloaded") {
      await dialog.alert(
        `${bundleFileName(chosen)} を保存しました。\nこのファイルを集約役に送ってください（集約役は「読み込む」で取り込みます）。`,
      );
    }
  };

  const closeMenu = () => menuRef.current?.removeAttribute("open");

  const print = async () => {
    const warnings = isCount
      ? []
      : validateRows([
          { rows: sheet.doneRows, label: "実施報告書" },
          { rows: sheet.planRows, label: "授業予定" },
        ]);
    if (warnings.length) {
      const list = warnings.map((w) => `・${w}`).join("\n");
      if (!(await dialog.confirm(`入力に気になる点があります：\n\n${list}\n\nこのまま印刷しますか？`))) return;
    }
    window.print();
  };

  const exportSheet = () => {
    downloadText(exportSheetJSON(entry, roster.clinic), sheetFileName(sheet));
    closeMenu();
  };

  const exportBackup = () => {
    downloadText(exportRosterJSON(roster), backupFileName());
    closeMenu();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    closeMenu();
    if (!file) return;
    try {
      const result = parseImport(await file.text());
      if (result.kind === "roster") {
        const n = result.roster.entries.length;
        if (
          !(await dialog.confirm(
            `全体バックアップ（${n}人分）で、このPCのデータをすべて置き換えます。よろしいですか？`,
            { ok: "置き換える", danger: true },
          ))
        )
          return;
        dispatch({ type: "replaceAll", roster: result.roster });
        return;
      }
      if (result.kind === "bundle") {
        const plan = planBundleImport(roster.entries, result.sheets);
        const names = (xs: { student: string }[]) => xs.map((s) => s.student.trim() || "（名前未入力）").join("、");
        const lines = [
          `${result.sheets.length}人分の帳票を読み込みます。`,
          plan.replace.length
            ? `\n上書き（登録済み）：${plan.replace.length}人\n${names(plan.replace.map((x) => x.sheet))}`
            : "",
          plan.add.length ? `\n新しく追加：${plan.add.length}人\n${names(plan.add)}` : "",
          "\n※ 生徒名と講師名が同じ生徒を「登録済み」とみなします。",
        ];
        if (!(await dialog.confirm(lines.filter(Boolean).join("\n"), { ok: "読み込む" }))) return;
        dispatch({ type: "importSheets", replace: plan.replace, add: plan.add });
        setTab("list");
        return;
      }
      const name = result.sheet.student.trim();
      const same = name ? roster.entries.find((x) => x.sheet.student.trim() === name) : undefined;
      if (
        same &&
        (await dialog.confirm(
          `「${name}」は登録済みです。読み込んだ内容で置き換えますか？\n（キャンセルすると別の生徒として追加します）`,
          { ok: "置き換える", cancel: "別の生徒として追加" },
        ))
      ) {
        dispatch({ type: "replaceStudentSheet", id: same.id, sheet: result.sheet });
      } else {
        dispatch({ type: "addStudent", entry: newEntry(result.sheet) });
      }
      dispatch({ type: "setClinicAll", clinic: mergeClinicFillEmpty(roster.clinic, result.clinic) });
    } catch (err) {
      await dialog.alert(`読み込みに失敗しました：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="app" data-tab={tab} data-printing={printJob ? "batch" : undefined}>
      <div className="chrome no-print">
        <div className="topbar">
          <div className="brand">
            <b>個別指導部　帳票作成</b>
            <span>回数報告書（月初）／実施報告書・授業予定（月末・裏表）</span>
          </div>
          <details className="menu" ref={menuRef}>
            <summary className="btn ghost">読み込み・書き出し ▾</summary>
            <div className="menu-body">
              <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
                JSONを読み込む
              </button>
              <button type="button" className="btn ghost" onClick={exportSheet}>
                この生徒を書き出す
              </button>
              <button type="button" className="btn ghost" onClick={exportBackup}>
                全体バックアップを書き出す
              </button>
              <small>データはこのPC内（ブラウザ）にだけ保存されます。</small>
            </div>
          </details>
          {!isList && (
            <button type="button" className="btn primary" onClick={print}>
              {isCount ? "印刷（回数報告書）" : "印刷（実施＋予定）"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        <UpdateBanner />
        {loadWarning && (
          <div className="banner">
            {loadWarning}
            <button type="button" className="btn ghost" onClick={dismissLoadWarning}>
              閉じる
            </button>
          </div>
        )}
        {saveError && <div className="banner error">{saveError}</div>}
        {externalChange && (
          <div className="banner">
            別のタブ（ウィンドウ）でデータが変更されました。このまま入力すると上書きされます。
            <button type="button" className="btn ghost" onClick={() => location.reload()}>
              再読み込み
            </button>
          </div>
        )}
        {!isList && <RosterBar roster={roster} dispatch={dispatch} />}
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isList ? (
        <div className="no-print">
          <StudentList
            entries={roster.entries}
            visible={visible}
            teacher={teacher}
            onTeacher={setTeacher}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onOpen={openStudent}
            onAdd={addFromList}
            onPrintCount={() => printBatch("count")}
            onPrintPair={() => printBatch("pair")}
            onAdvance={advance}
            onSend={send}
            onImport={() => fileRef.current?.click()}
          />
        </div>
      ) : (
        <div className="layout">
          <section className="panel no-print" key={entry.id}>
            <MetaForm tab={tab} sheet={sheet} clinic={roster.clinic} dispatch={dispatch} />
            {tab === "count" && <CountEditor sheet={sheet} dispatch={dispatch} />}
            {tab === "done" && (
              <LessonRowsEditor list="doneRows" rows={sheet.doneRows} otherRows={sheet.planRows} dispatch={dispatch} />
            )}
            {tab === "plan" && <ScheduleEditor sheet={sheet} dispatch={dispatch} />}
            {tab === "plan" && (
              <LessonRowsEditor list="planRows" rows={sheet.planRows} otherRows={sheet.doneRows} dispatch={dispatch} />
            )}
          </section>
          <section className={`previewwrap${showPreview ? "" : " collapsed"}`}>
            <button
              type="button"
              className="btn ghost preview-toggle no-print"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "プレビューを閉じる" : "印刷イメージ（A4プレビュー）を見る"}
            </button>
            <div className="preview-body">
              <div className="hint no-print">
                {isCount
                  ? "▼ 回数報告書（月初）／このタブで印刷すると1枚だけ出ます"
                  : "▼ 実施＝表・授業予定＝裏／このタブで印刷すると2枚出ます（両面印刷・長辺とじで1枚両面に）"}
              </div>
              <Sheets tab={tab} sheet={sheet} clinic={roster.clinic} />
            </div>
          </section>
        </div>
      )}
      {printJob && <BatchPrint job={printJob} entries={roster.entries} clinic={roster.clinic} />}
    </div>
  );
}
