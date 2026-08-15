# Capacitor によるアプリ化（iOS / Android）

このアプリは **Next.js のサーバー機能**（Server Actions・Prisma/DB・Cookie 認証・
middleware）を使うため、`output: 'export'` による完全な静的化はできません。
そのため Capacitor では **「公開URLのサーバー版を WebView で読み込む」方式** を採用します。

- ネイティブアプリ = 薄いネイティブシェル＋WebView
- WebView が公開URL（本番の Next.js サーバー）を表示する
- 1コードベース（`web/`）で Web とアプリの両対応を維持

> このリポジトリには Capacitor の**設定・シェル・手順**までを用意しています。
> `ios/` `android/` プロジェクトの生成と実機ビルドは、それぞれ **macOS + Xcode**、
> **Android Studio + Android SDK** が必要で、この手順に従って各自の環境で行います。
> （`ios/` `android/` は生成物のため `.gitignore` 済み）

## 構成

- `capacitor.config.ts` … appId / appName / `server.url` / `webDir` の設定
- `native/www/index.html` … `server.url` 未設定時に表示されるオフライン用シェル
- npm スクリプト: `cap:sync` / `cap:add:ios` / `cap:add:android` / `cap:open:ios` / `cap:open:android`

## 前提

- Node.js（このプロジェクトと同じ）
- iOS: macOS + Xcode + CocoaPods
- Android: Android Studio + Android SDK（JDK 含む）

## セットアップ手順

1. 依存はインストール済み（`@capacitor/core`, `@capacitor/cli`）。未取得なら:

   ```bash
   npm install
   ```

2. **公開URLを設定**する。`capacitor.config.ts` の `server.url` を、
   デプロイ済みアプリのURLにします（本番は https 推奨）。

   ```ts
   server: {
     url: "https://your-deployed-app.example.com",
     androidScheme: "https",
   }
   ```

   - ローカル実機確認では開発マシンの LAN IP を使います（例: `http://192.168.1.10:3000`）。
     この場合 `npm run dev` を起動しておきます（`cleartext: true` で http を許可済み）。

3. **プラットフォームを追加**する（各自の環境で）:

   ```bash
   npm run cap:add:ios       # macOS のみ
   npm run cap:add:android
   ```

4. 設定・Webアセットを**同期**する:

   ```bash
   npm run cap:sync
   ```

5. **IDE で開いてビルド/実行**する:

   ```bash
   npm run cap:open:ios      # Xcode が開く → 実機/シミュレータで実行
   npm run cap:open:android  # Android Studio が開く → 実機/エミュレータで実行
   ```

## 動作イメージ

- `server.url` を設定 → アプリ起動時に WebView がそのURL（Next.js サーバー版）を読み込む。
  カタログ・カート・予約・決済・マイページなど、Web と同じ機能がそのまま動く。
- `server.url` 未設定 → `native/www/index.html`（接続中シェル）が表示される。

## 補足・今後

- **オフライン対応や push 通知、カメラ等のネイティブ機能**が必要になったら、
  対応する Capacitor プラグイン（`@capacitor/push-notifications` 等）を追加する。
- WebView に載せる URL を切り替えるだけなので、ステージング/本番の出し分けは
  `capacitor.config.ts` の `server.url`（またはビルド時の環境変数）で行う。
- 完全オフライン動作が要件になる場合は、対象画面のみ静的化した別ビルドを
  `webDir` に置く設計を別途検討する（現状の DB/サーバー依存機能とは両立しないため要分離）。
