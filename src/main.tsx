import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/sheet.css";
import App from "./App.tsx";
import { DialogProvider } from "./components/Dialog";

// 端末の保存データをブラウザが自動で消さないよう依頼する（対応ブラウザのみ・失敗しても動作に影響なし）
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
);
