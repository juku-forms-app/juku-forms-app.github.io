import { useEffect, useReducer, useRef, useState } from "react";
import { loadRoster, saveRoster, STORAGE_KEY } from "../lib/storage";
import { rosterReducer } from "./rosterReducer";

const SAVE_DELAY_MS = 300;

/** ロスター全体の状態。変更のたびに（少し遅らせて）localStorage へ自動保存する */
export function useRoster() {
  const [initial] = useState(() => loadRoster());
  const [roster, dispatch] = useReducer(rosterReducer, initial.roster);
  const [loadWarning, setLoadWarning] = useState(initial.warning);
  const [saveError, setSaveError] = useState<string>();
  const [externalChange, setExternalChange] = useState(false);
  const dirty = useRef(false);
  const latest = useRef(roster);
  latest.current = roster;

  useEffect(() => {
    // 起動直後は読み込んだ内容そのままなので書き戻さない（壊れたデータの退避を上書きしないため）
    // StrictMode の二重実行でも誤保存しないよう、参照の同一性で判定する
    if (roster === initial.roster) return;
    dirty.current = true;
    const t = setTimeout(() => {
      dirty.current = false;
      const res = saveRoster(roster);
      setSaveError(res.ok ? undefined : res.error);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [roster, initial.roster]);

  // 閉じる直前に保留中の保存を確定させる
  useEffect(() => {
    const flush = () => {
      if (dirty.current) saveRoster(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // 同じPCで別タブが開かれて書き換えられた場合に気づけるようにする（黙って上書きしない）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setExternalChange(true);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    roster,
    dispatch,
    loadWarning,
    dismissLoadWarning: () => setLoadWarning(undefined),
    saveError,
    externalChange,
  };
}
