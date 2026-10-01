// アプリ内の確認・お知らせダイアログ。
// window.confirm / alert は環境によって表示されず即 false を返す（アプリ内ブラウザ・埋め込み表示など）ため使わない。

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ConfirmOptions = { ok?: string; cancel?: string; danger?: boolean };
type DialogApi = {
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
  alert: (message: string) => Promise<void>;
};

type Pending = { message: string; opts: ConfirmOptions; alertOnly: boolean; resolve: (ok: boolean) => void };

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog は DialogProvider の内側で使う");
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);
  const current = queue[0];

  const open = useCallback(
    (message: string, opts: ConfirmOptions, alertOnly: boolean) =>
      new Promise<boolean>((resolve) => setQueue((q) => [...q, { message, opts, alertOnly, resolve }])),
    [],
  );
  const api = useRef<DialogApi>({
    confirm: (message, opts = {}) => open(message, opts, false),
    alert: (message) => open(message, {}, true).then(() => undefined),
  });

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  return (
    <DialogContext.Provider value={api.current}>
      {children}
      {current && <DialogView pending={current} onClose={close} />}
    </DialogContext.Provider>
  );
}

function DialogView({ pending, onClose }: { pending: Pending; onClose: (ok: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  const { message, opts, alertOnly } = pending;

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="dialog" role={alertOnly ? "alertdialog" : "dialog"} aria-modal="true" aria-label="確認">
        <p className="dialog-msg">{message}</p>
        <div className="dialog-actions">
          {!alertOnly && (
            <button type="button" className="btn ghost" onClick={() => onClose(false)}>
              {opts.cancel ?? "キャンセル"}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            className={`btn ${opts.danger ? "danger-solid" : "primary"}`}
            onClick={() => onClose(true)}
          >
            {alertOnly ? "OK" : (opts.ok ?? "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
