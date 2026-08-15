# 雅アプリ化 手順書（人間の作業）

Web版（Next.js）はコンテナ内で完成しています。ここから先の **ネイティブアプリの生成・
実機ビルド・ストア申請** は、macOS + Xcode / Android Studio が必要で、開発コンテナや
クラウド環境では実行できません。**あなたが自分の Mac / PC で行う作業** を、順番に並べた
手順書です。

- **方式**: `server.url`（ネイティブシェルが WebView で公開URLのサーバー版を表示）
- **初回の目安**: 半日〜1日＋ストア審査
- **対象**: `web/` ディレクトリ

> **前提**: このアプリは Server Actions・データベース・Cookie認証を使うため、完全な静的化
> （`output: 'export'`）はできません。そこで Capacitor は「公開URLのサーバー版を WebView で
> 表示する（`server.url`）方式」で動かします。つまり **先に Web を本番公開して URL を用意する
> こと** が、すべての出発点です。設定・シェル・npmスクリプトはリポジトリに用意済み
> （`web/capacitor.config.ts`, `web/docs/CAPACITOR.md`）。

---

## 0. 準備するもの

着手前にそろえておくと、途中で止まりません。

### 共通（どの環境でも）
- **Node.js**（リポジトリと同じ版）と **Git**
- **公開URL**：Web を本番デプロイ（例：Vercel）
- 本番DB（**PostgreSQL**）と環境変数一式
- アプリ **アイコン元画像**（1024×1024 PNG）

### iOS（Apple向け）
- **Mac**（必須）
- **Xcode**（Mac App Store）＋ **CocoaPods**
- **Apple Developer Program**（年 $99）
- App Store Connect のアカウント

### Android（Google向け）
- **Android Studio**（＋ SDK・JDK）
- Mac / Windows / Linux いずれも可
- **Google Play Developer**（初回 $25）
- リリース署名鍵（keystore）を後で作成

---

## A. 事前準備

Web を公開し、設定を自社の値に確定します。

1. **Web アプリを本番公開して URL を得る**
   Vercel などにデプロイし、本番DB（Postgres）と環境変数（`DATABASE_URL` /
   `ADMIN_USER` / `ADMIN_PASSWORD`）を設定。手順は `web/docs/DEPLOYMENT.md`。
   ブラウザで公開URLが開けることを確認します。

2. **リポジトリを取得して依存をインストール**
   ```bash
   # リポジトリを clone 後
   cd web
   npm install
   ```

3. **`capacitor.config.ts` を自社の値に編集**
   `appId` を自社の逆ドメインに、`server.url` を手順1の公開URL（https）に。
   本番では `cleartext` 行を削除します（httpsのみ許可）。
   ```ts
   const config: CapacitorConfig = {
     appId: "jp.co.yourcompany.miyabi",  // ← 自社の逆ドメイン
     appName: "きものレンタル 雅",
     webDir: "native/www",
     server: {
       url: "https://app.yourcompany.jp",   // ← 公開URL(https)
       androidScheme: "https",
       // cleartext: true ← 本番では削除
     },
   };
   ```
   > **重要**: `appId` はストア登録と紐づき後から変更が困難です。配布に使う正式な
   > 逆ドメインを最初に確定してください。

---

## B. ネイティブプロジェクトの生成

`ios/`・`android/` はここで生成されます（`.gitignore` 済み）。

1. **プラットフォームを追加する**（iOS の追加は **Mac のみ**。Android はどのOSでも可）
   ```bash
   npm run cap:add:ios       # macOS のみ
   npm run cap:add:android
   ```

2. **設定と Web アセットを同期する**
   ```bash
   npm run cap:sync
   ```

3. **アイコン・スプラッシュを生成する**（1024px の元画像から各サイズを自動生成）
   ```bash
   npm i -D @capacitor/assets
   # assets/ に icon.png(1024px) と splash.png を置いてから
   npx capacitor-assets generate
   ```

---

## C. 実機・エミュレータで確認

起動して、WebView に公開版の雅が出れば成功です。

### iOS（Xcode）
1. **Xcode で開く**
   ```bash
   npm run cap:open:ios
   ```
2. **署名（Signing）を設定する**
   **Signing & Capabilities** タブで **Team** を自分の Apple ID / 組織に設定。
   Bundle Identifier が `appId` と一致していることを確認します。
3. **実機 / シミュレータで Run**
   上部で端末を選び ▶ を押します。初回は実機側で「信頼」の許可が必要な場合があります。

### Android（Android Studio）
1. **Android Studio で開く**
   ```bash
   npm run cap:open:android
   ```
2. **Gradle 同期後、エミュレータ / 実機で Run**
   初回は Gradle の同期に数分かかります。完了後 ▶ で起動します。

### 起動後の確認チェックリスト
次が問題なく動けば、実運用に進めます。

- [ ] 商品一覧・**検索**・並び替え・カテゴリ絞り込み
- [ ] 商品詳細 → カート追加 → **予約申込**（受付番号が出る）
- [ ] 予約照会・**オンライン決済（テスト）**・キャンセル
- [ ] 会員登録 / ログイン / マイページ / **お気に入り**
- [ ] 端末の「戻る」操作・画面回転・通信を切ったとき接続シェルが出る

---

## D. ストア申請・公開

審査を経て一般公開します。ここは各ストアの管理画面が主役です。

### iOS — App Store
1. **App Store Connect でアプリを登録** — Bundle ID に `appId` を指定してアプリレコードを作成。
2. **Xcode でアーカイブ → アップロード** — 端末を **Any iOS Device** に切替 →
   **Product › Archive** → **Distribute App › App Store Connect**。
3. **TestFlight で確認 → 審査提出 → 公開** — アプリ情報・スクリーンショット・プライバシー
   （データ利用）を入力し、審査に提出。承認後に公開します。

### Android — Google Play
1. **リリース署名鍵（keystore）を作成**
   ```bash
   keytool -genkey -v -keystore miyabi.keystore \
     -alias miyabi -keyalg RSA -keysize 2048 -validity 10000
   ```
   > **重要**: keystore とパスワードは **紛失厳禁**。失うと以後のアップデートを公開できません。
   > 安全に保管してください。
2. **署名付き AAB を生成** — Android Studio の **Build › Generate Signed Bundle / APK ›
   Android App Bundle** で作成します。
3. **Play Console にアップロード → 審査 → 公開** — アプリを作成し AAB をアップロード。
   ストア掲載情報・コンテンツのレーティング・**データセーフティ** を入力し、内部テスト →
   製品版へ段階公開します。

---

## E. 公開後の更新運用

ここが `server.url` 方式のいちばんの利点です。

**画面・機能の更新は「Web を再デプロイするだけ」。ストア再申請は不要** — アプリが表示して
いるのは公開URLのサーバー版だからです。商品追加、文言修正、価格改定、レビューや決済の
改善などは、Web を本番デプロイした瞬間にアプリにも反映されます。

再申請が要るのは、アプリ名・アイコン・要求する権限・Capacitorプラグインの追加・対応OS
バージョンの変更など、**ネイティブ側の「ガワ」を変えたときだけ** です。

---

## よくあるつまずき

- **iOS 審査で「4.2 最低限の機能」を指摘される**
  WebView 主体アプリは、単なるサイトのラッパーと見なされると却下されることがあります。
  プッシュ通知・カメラ等のネイティブ機能や、アプリならではの価値を持たせると通りやすく
  なります（対応プラグインを追加）。
- **白画面のまま何も表示されない**
  `server.url` の到達性と https を確認。端末のネット接続、証明書エラーの有無もチェックします。
- **CocoaPods が無いと言われる（iOS）**
  `sudo gem install cocoapods` を実行してから `cap sync` を再実行します。
- **Android で http のローカルIPに繋がらない**
  ローカル実機確認のときだけ `cleartext: true` を有効に。本番は https なので不要です。

---

_この手順書は `web/capacitor.config.ts` と `web/docs/CAPACITOR.md` を人間の作業目線でまとめた
ものです。正式な `appId`（配布用の逆ドメイン）と公開URLが決まれば、設定への反映は別途行えます。_
