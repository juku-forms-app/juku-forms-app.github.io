// 端末ローカル（localStorage）への保存。サーバー・クラウドには一切送らない。
// 形式を変えるときはキーの版を上げ、ここで旧版からの移行を書く。

import type { Roster } from "../types";
import { emptyRoster, normalizeRoster } from "./normalize";

export const STORAGE_KEY = "juku-form-app:roster:v1";
/** 復元できなかった保存データの退避先（上書きで失わないように） */
export const CORRUPT_KEY = "juku-form-app:roster:corrupt";

export type LoadResult = { roster: Roster; warning?: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

export function loadRoster(storage: Storage | undefined = safeStorage()): LoadResult {
  if (!storage) {
    return { roster: emptyRoster(), warning: "このブラウザでは保存が使えません。入力内容は閉じると消えます。" };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { roster: emptyRoster(), warning: "保存データを読み込めませんでした。" };
  }
  if (raw == null) return { roster: emptyRoster() };
  try {
    const roster = normalizeRoster(JSON.parse(raw));
    if (roster) return { roster };
  } catch {
    // 下で退避
  }
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch {
    // 退避できなくても起動は続ける
  }
  return {
    roster: emptyRoster(),
    warning: "保存データが壊れていたため新規で開きました（元データは退避済み）。",
  };
}

export function saveRoster(roster: Roster, storage: Storage | undefined = safeStorage()): SaveResult {
  if (!storage) return { ok: false, error: "このブラウザでは保存が使えません。" };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(roster));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    return {
      ok: false,
      error: quota
        ? "保存容量がいっぱいです。不要な生徒を削除するか、全体バックアップを書き出してください。"
        : "保存に失敗しました。",
    };
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
