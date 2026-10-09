import { useRegisterSW } from "virtual:pwa-register/react";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * 新しい版が公開されたら知らせ、ボタンで切り替える。
 * 入力途中で画面が勝手に入れ替わらないよう、自動では切り替えない。
 * ホーム画面のアプリは開きっぱなしになりやすいので、1時間ごとにも確認する。
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), CHECK_INTERVAL_MS);
    },
  });
  if (!needRefresh) return null;
  return (
    <div className="banner update">
      新しい版があります。入力した内容は保存されたまま切り替わります。
      <button type="button" className="btn primary" onClick={() => updateServiceWorker(true)}>
        更新する
      </button>
    </div>
  );
}
