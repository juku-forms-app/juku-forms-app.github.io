// SPEC §3 のデータモデル。SheetData は JSON 書き出し／読み込みの形式でもあり、試作HTMLと互換。

export const LESSON_TYPES = ["通常", "定期対策", "振替(前月分)"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export type LessonRow = {
  m: string; // 月
  d: string; // 日
  type: LessonType;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  subject: string; // 授業科目
};

/** 回数報告書の1科目ブロック（手入力・想定回数。自動集計しない） */
export type CountBlock = {
  subject: string;
  通常: string;
  持ち越し: string; // = 振替(前月分)
  定期対策: string;
};

/** いつもの授業（毎週の決まったコマ）。weekday は 0=日 … 6=土 */
export type WeeklySlot = {
  weekday: number;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  subject: string;
};

/** 各紙の右上に印刷する塾情報。教室で共通なのでロスター単位で1つだけ持つ */
export type ClinicInfo = {
  clinicName: string;
  manager: string;
  tel: string;
};

export type SheetData = ClinicInfo & {
  // 3枚共通メタ
  month: string; // 対象月（回数報告書・実施報告書の月）
  /** 授業予定の月。初期値は month の翌月で、month を変えると追従する（手で変えた後は追従しない）。SPECからの拡張 */
  planMonth: string;
  student: string;
  teacher: string;
  dept: string; // 例: "中等部"
  submitDate: string; // "YYYY-MM-DD"
  // 本体
  doneRows: LessonRow[]; // 実施報告書
  planRows: LessonRow[]; // 授業予定
  countBlocks: CountBlock[]; // 回数報告書（5枠）
  /** いつもの授業。授業予定の自動作成に使う（SPECからの拡張・印刷はしない） */
  schedule: WeeklySlot[];
};

/** 生徒1人分の帳票。塾情報はロスター側に持つので除く */
export type StudentSheet = Omit<SheetData, keyof ClinicInfo>;

export type RosterEntry = {
  id: string;
  sheet: StudentSheet;
  updatedAt: string; // ISO日時
};

/** localStorage に保存する全体。共用PC1台に複数生徒を保持する */
export type Roster = {
  version: 1;
  clinic: ClinicInfo;
  entries: RosterEntry[];
  activeId: string;
};

export type RowsKey = "doneRows" | "planRows";
export type Tab = "list" | "count" | "done" | "plan";
