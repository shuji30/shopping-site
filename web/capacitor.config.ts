import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor 設定。
//
// このアプリは Next.js のサーバー機能（Server Actions / Prisma / Cookie 認証）を
// 使うため、静的エクスポート（output: 'export'）はできない。したがってネイティブ
// アプリは「公開URLのサーバー版を WebView で読み込む」方式で動かす。
//
// - 本番: `server.url` に公開URLを設定すると、iOS/Android アプリは常に最新の
//   サーバーレンダリング版を表示する。
// - ローカル確認: `server.url` を開発マシンの LAN IP（例: http://192.168.1.10:3000）に
//   すると、実機/エミュレータから `npm run dev` の画面を確認できる。
// - `server.url` 未設定時は `webDir`（native/www）のオフライン用シェルを表示する。
//
// 実際のプラットフォーム追加（ios/android）とビルドには macOS+Xcode / Android Studio
// が必要。手順は docs/CAPACITOR.md を参照。

const config: CapacitorConfig = {
  appId: "jp.miyabi.kimono",
  appName: "きものレンタル 雅",
  webDir: "native/www",
  server: {
    // 本番URL or ローカルIPを設定する（未設定なら webDir のシェルを表示）
    // url: "https://your-deployed-app.example.com",
    androidScheme: "https",
    cleartext: true, // ローカルの http://<LAN-IP>:3000 確認を許可（本番URLは https 推奨）
  },
};

export default config;
