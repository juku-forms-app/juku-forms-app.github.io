# 個別指導部 帳票作成アプリ

回数報告書・実施報告書・授業予定の3帳票を入力し、紙と同じ体裁でA4印刷するアプリ。
仕様は [SPEC_個別指導帳票アプリ.md](SPEC_個別指導帳票アプリ.md)、参照実装は [reference/個別指導_帳票_試作.html](reference/個別指導_帳票_試作.html)。

- データは **開いた端末のブラウザ（localStorage）にだけ** 保存される。生徒のデータはどこにも送信しない。
- アプリ本体（プログラムだけ）は GitHub Pages で配信し、URL を開くだけで使える。ホーム画面に追加できる（PWA）。
- 運用：講師がスマホで入力 →「送る」で1ファイルにまとめて集約役へ → 集約役がPCで読み込み、まとめて印刷。
  手順は [docs/手順書.md](docs/手順書.md)。共用PCができた場合も、同じURLをそのPCで開けばそのまま使える。
- JSON：生徒1人分（試作HTMLと同じ形式）／複数生徒の束（送る用・塾情報は含めない）／全体バックアップ。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # ロジックのテスト（Vitest）
npm run typecheck
npm run build      # dist/ に出力
```

## 公開（GitHub Pages）

1. GitHub にリポジトリを作り、このフォルダを `main` ブランチに push する。
2. リポジトリの Settings → Pages → Source を **GitHub Actions** にする。
3. 以後は `main` に push するたびに、テスト → ビルド → 公開が自動で走る（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）。
   公開URLは `https://juku-forms-app.github.io/`（リポジトリ名が `<組織名>.github.io` なのでサイト直下で公開される）。
4. 引き継ぐときは、リポジトリを後任のアカウントへ Transfer する（URL が変わるので講師に再配布する）。

## 印刷

- **回数報告書タブ** で印刷 → 回数報告書 1ページ。
- **実施報告書／授業予定タブ** で印刷 → 1ページ目＝実施（表）、2ページ目＝授業予定（裏）。コピー機で **両面・長辺とじ**。
- 印刷ダイアログは「余白：なし」「倍率：100%」「背景のグラフィック：オン」を推奨。
- 1ページに入るのは最大16行。超えると表裏がずれるため、印刷前に警告を出す。

## 構成

```
src/
  types.ts                 データモデル（SPEC §3）とロスター型
  lib/rows.ts              空行・複製・削除・行数定数
  lib/validate.ts          印刷前チェック
  lib/normalize.ts         外部データ（保存データ・JSON）の補正
  lib/storage.ts           localStorage 保存（版付きキー、壊れたデータの退避）
  lib/jsonio.ts            JSON 書き出し／読み込み・送る（共有）
  lib/students.ts          生徒一覧の集計・絞り込み・翌月へ進める
  state/rosterReducer.ts   全操作を reducer に集約
  state/useRoster.ts       自動保存・別タブ変更の検知
  components/StudentList   生徒一覧（まとめて印刷・送る・翌月へ進める）
  components/Dialog        アプリ内ダイアログ（window.confirm は環境によって表示されないため使わない）
  components/panel/        入力パネル
  components/sheets/       A4帳票（CountSheet / LessonSheet）
  styles/sheet.css         A4・印刷CSS（試作から移植）
```

保存形式を変えるときは `lib/storage.ts` のキーの版を上げ、旧版からの移行処理を書くこと。
