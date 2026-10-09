/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages は https://<ユーザー名>.github.io/<リポジトリ名>/ で配信されるので、
  // デプロイ時だけ BASE_PATH=/<リポジトリ名>/ を渡す（.github/workflows/deploy.yml）。手元では "/"。
  base: process.env.BASE_PATH || "/",
  plugins: [
    react(),
    // ホーム画面に追加して使えるようにする（オフラインでも起動、iOS で保存データが消されにくくなる）。
    // 置くのはアプリ本体だけで、生徒のデータは端末の localStorage から外に出ない。
    // 更新は「新しい版があります［更新する］」で利用者が切り替える（src/components/UpdateBanner.tsx）
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "個別指導部 帳票作成",
        short_name: "帳票作成",
        description: "回数報告書・実施報告書・授業予定の入力と印刷",
        lang: "ja",
        display: "standalone",
        background_color: "#e9edf1",
        theme_color: "#274060",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: { environment: "jsdom" },
});
