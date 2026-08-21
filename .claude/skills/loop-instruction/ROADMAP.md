# ロードマップ — 着物レンタルECサイト

各ループの冒頭で読み、末尾で更新する。
状態: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

## 凡例・使い方

- 上から順（または優先度順）に1ループ1タスクで進める。
- ループ中に新しく必要と分かったタスクは、この一覧に追記してから着手する。
- 完了したタスクは `[x]` にし、対応するループ番号を末尾に添える（例: `(loop 1)`）。

## Phase 0: 骨子・計画（完了）

- [x] 骨子スキル（SKILL.md）の作成：ループの進め方を定義 (loop 1)
- [x] ROADMAP.md / HISTORY.md の雛形作成 (loop 1)
- [x] 目的の確定：着物レンタルECサイト（Web＋アプリ両対応 / MVPはカタログ表示） (loop 2)
- [x] ゴールの具体化とロードマップへのタスク分解 (loop 2)

## Phase 1: MVP（カタログ表示のみ）✅ 完了（loop 3〜11）

- [x] プロジェクト雛形のセットアップ（Next.js App Router + TypeScript + Tailwind CSS） (loop 3)
- [x] 商品データモデルの定義（名前 / 画像 / レンタル料 / サイズ / カテゴリ / 素材・説明 / 在庫状況 など） (loop 4)
- [x] サンプル商品データ（JSON）の作成 (loop 5)
- [x] 共通レイアウト（ヘッダー / フッター / ナビゲーション）とデザイントークン (loop 6)
- [x] トップページ（ヒーロー、注目商品の導線） (loop 7)
- [x] 商品一覧ページ（レスポンシブなグリッド、カテゴリ等での絞り込み） (loop 8)
- [x] 商品詳細ページ（画像・レンタル料・サイズ・説明の表示） (loop 9)
- [x] レスポンシブ確認（スマホ / タブレット / PC）と見た目の調整 (loop 10)
- [x] README に起動方法・構成を記載 (loop 11)

## Phase 2 以降: MVP 外（着手は MVP 達成後）

- [x] カート＋レンタル期間選択（loop 12〜14）✅
  - [x] カート基盤（Context + localStorage + ヘッダーのカートバッジ） (loop 12)
  - [x] 商品詳細でサイズ・レンタル開始日を選び、カートに追加 (loop 13)
  - [x] カートページ（明細一覧・削除・合計金額） (loop 14)
- [x] 予約申込フォーム（決済なし・確認画面まで） (loop 15)
- [x] 在庫カレンダー（貸出中期間の表示・重複予約の抑止 / サーバー側でも二重予約防止） (loop 23)
- [x] ユーザー認証・マイページ ✅
  - [x] 予約照会（受付番号＋メールで自分の予約を確認 / 両一致必須） (loop 24)
  - [x] ユーザー自身による予約キャンセル（受付状態のみ／マイページ＝セッション・予約照会＝受付番号+メール） (loop 36)
  - [x] アカウント制のログイン（loop 27〜29）✅
    - [x] 認証基盤（User/Session, scryptハッシュ, セッションCookie）＋会員登録 (loop 27)
    - [x] ログイン / ログアウト＋ヘッダーのログイン状態 (loop 28)
    - [x] マイページ（予約履歴）＋予約とユーザーの紐付け (loop 29)
    - [x] マイページに決済状況表示＋その場でオンライン決済（本人確認は予約ID×セッション） (loop 35)
    - [x] 会員登録時にパスワードを2回入力させる（確認用フィールドを追加、一致検証） (loop 60)
    - [x] パスワードリマインダー（パスワードをお忘れの方向けの再設定機能）を追加 (loop 61)
- [x] オンライン決済（テストモード/モックゲートウェイ。予約照会からお支払い、決済状態を管理・照会に表示。Stripe等の実APIは `lib/payment.ts` の `processPayment` を差し替え） (loop 33)
- [x] 配送・返却フロー（loop 25〜26）✅
  - [x] 予約ステータス（受付/発送済み/返却済み/キャンセル）＋返却期限の表示（管理・照会） (loop 25)
  - [x] 管理画面でステータス更新（サーバーアクション） (loop 26)
- [~] Capacitor による iOS/Android アプリ化
  - [x] 導入の下準備：@capacitor/core・cli 導入、capacitor.config.ts（server.url方式）、native/www シェル、npm scripts、docs/CAPACITOR.md (loop 43)
  - [x] 人間の作業手順書（docs/CAPACITOR-runbook.md）を追加 (loop 44)
  - [ ] ios/android プロジェクト生成＋実機ビルド（要 macOS+Xcode / Android Studio。この環境では不可・runbook 参照）
- [x] バックエンド化＋データ永続化（Prisma + SQLite）（loop 16〜18）✅
  - [x] DB基盤（Prisma7 + SQLite + libSQLアダプタ / Kimonoスキーマ / マイグレーション / シード / 商品リポジトリ） (loop 16)
  - [x] 商品ページ群（トップ/一覧/詳細/カテゴリ）をDB経由（async）へ切替 (loop 17)
  - [x] 予約をDBに永続化（Reservation モデル + サーバーアクション） (loop 18)
- [x] 本番DB（Postgres）対応の下準備 — DATABASE_URL でアダプタ自動選択＋切替手順ドキュメント (loop 30)
- [x] 管理画面（loop 19〜22）✅
  - [x] レイアウト分離（route group (site) を導入し店舗フロントと管理を分ける） (loop 19)
  - [x] 予約一覧（/admin/reservations）＋管理レイアウト (loop 20)
  - [x] 予約詳細（/admin/reservations/[id]）＋ダッシュボード集計（/admin） (loop 21)
  - [x] 管理画面のアクセス保護（Basic認証 middleware） (loop 22)
  - [x] 決済状況の可視化（一覧に入金列＋ダッシュボードに入金件数/入金額タイル） (loop 34)
  - [x] レビュー管理（一覧・削除によるモデレーション） (loop 47)
  - [x] 入金ステータスの手動更新（未入金/入金済み/返金済みを管理画面から切替） (loop 62)
  - [ ] **商品マスタの管理（登録・変更・削除）** — ユーザー指摘（2026-08-21）。
        カテゴリは管理できるのに商品ができない。現状は `data/kimonos.ts` を編集して
        `npm run db:seed` する運用で、**デプロイと手作業が必要**。しかも seed は
        `update: {}` なので既存行は更新されず、**価格や在庫の変更ができない**。
    - [x] 検証とサーバーアクションの土台 (loop 79) — `lib/kimono-validation.ts`（純粋関数）と
          `lib/actions/admin-kimono.ts`（create/update/delete）。UIは次ループ
    - [ ] 一覧・新規登録・編集（`/admin/kimonos`）
          項目: 識別子 / 商品名 / カテゴリ（マスタから選択）/ レンタル料 / レンタル日数 /
          サイズ / 色 / 素材 / 説明 / 在庫 / 注目フラグ。
          sizes・colors・images はDBにJSON文字列で入っているので、UIはカンマ区切り等で受けて変換する。
    - [ ] 削除（予約明細 `ReservationItem` が参照している商品は削除不可。
          過去の予約履歴が壊れるため。カテゴリと同じ方針）
    - [ ] 識別子は登録後に変更不可（商品URL `/kimono/<id>` と予約明細の `kimonoId` が壊れる）
    - [ ] `data/kimonos.ts` と seed の位置づけを「初期データ」に整理し、
          運用では管理画面が唯一の入口だと分かるようにする
    - [ ] 画像は現状プレースホルダのシード文字列。実画像のアップロードは別タスクとして切り出す
  - [x] 商品カテゴリマスタの管理（登録・変更・削除）— ユーザー要望（2026-08-20）。
        現在カテゴリは `lib/categories.ts` にハードコードされており、追加や名称変更に
        デプロイが必要。DBのマスタにして管理画面から編集できるようにする。
    - [x] カテゴリをDBマスタ化（`Category` モデル＋リポジトリ。表示は現状のまま＝挙動不変） (loop 71)
    - [x] 管理画面 `/admin/categories` で登録・変更・削除（商品が紐づくカテゴリは削除不可） (loop 72)
  - [x] フッターにバージョン表示（X.Y.Z＝人間が変更/masterへのpush回数/その push の
        コミット数。詳細はSKILL.mdの「バージョン表示」節） (loop 57)

## デプロイ・インフラ

- [x] **本番マイグレーションの自動化** (loop 74) — `scripts/migrate-turso.mjs` を追加し、
      CD の `gcloud run deploy` の**前**に実行。Turso の HTTP API を直接叩くので
      turso CLI も Prisma の libsql 対応も不要。`_applied_migrations` 台帳で
      未適用のみ適用し、**失敗したらデプロイを中止**する。台帳が空の初回は
      `TURSO_MIGRATION_BASELINE` の指定を必須にして誤爆を防ぐ。
      **人間の作業（一度だけ）**: `TURSO_DATABASE_URL`・`TURSO_AUTH_TOKEN` を Secrets に、
      `TURSO_MIGRATION_BASELINE` を Variables に登録（詳細は docs/CI-CD.md）。
      〈当初のメモ〉— 現状 CD（`deploy.yml`）はマイグレーションを
      実行せず（Dockerfile の `CMD` も `node server.js` のみ）、スキーマ変更を含む反映のたびに
      Turso への手作業が必要。**loop 71-72 の反映でこれを踏み、本番が全ページ500になった**
      （`Category` テーブルが未作成のまま新コードが動いた）。次を検討する:
      - `deploy.yml` の `gcloud run deploy` の**前**に、Turso CLI で未適用の
        `prisma/migrations/*/migration.sql` を流すステップを追加
      - 適用済み判定の持ち方（`_prisma_migrations` 相当を自前で用意するか、
        `CREATE TABLE IF NOT EXISTS` など冪等なSQLに限定するか）を決める
      - `TURSO_AUTH_TOKEN` を GitHub Secrets に登録（一度だけ・人間の作業）
      - 適用に失敗したらデプロイを中止する（壊れたコードを本番へ出さない）
      - 自動化できるまでの暫定として、手順を `docs/CI-CD.md` に runbook 化し、
        PRテンプレートの「本番反映時の注意」に必ず書く運用にする
- [ ] CD の OIDC トークン取得を1回で確定させる — `google-github-actions/auth@v2` の既定は
      **認証トークンを使うたびに** GitHub の OIDC エンドポイントへ取りに行くため、
      Docker push の時点で通信が途切れると `Unable to retrieve Identity Pool subject token`
      → `denied: Unauthenticated request` で落ちる（loop 75 の run #11 で実際に発生。
      再実行で通ったので設定ミスではなく一過性のネットワーク障害）。
      `token_format: 'access_token'` を指定して auth ステップでアクセストークンを
      確定させ、以後 OIDC に触らない形にする。あわせて次も検討:
      - `access_token_lifetime` をビルド時間より十分長く（既定1時間で足りる想定）
      - それでも落ちる場合に備え、push ステップだけ数回リトライする
- [ ] `migrate-turso.mjs` のエラーメッセージ改善 — 「どちらの環境変数が空か」を
      個別に出す（loop 75 の切り分けに手間取った反省）
- [ ] スキーマ変更を含む反映の事前チェック — マージ前に「本番DBに必要なテーブル/列が
      あるか」を確認する手段がない（この環境からは Turso にも本番URLにも到達できない）。
      CI で本番DBへ読み取り専用の疎通確認を行うか、少なくとも PR に
      「適用済みであることの確認方法」を書かせる。
- [x] 本番DB（Postgres）対応の下準備 — DATABASE_URL でアダプタ自動選択＋切替手順（loop 30 / docs/DEPLOYMENT.md）
- [x] GCP(Cloud Run)公開の下準備 — Dockerfile（standalone）＋.dockerignore＋docs/DEPLOY-GCP.md（Cloud Run + Cloud SQL） (loop 45)
- [x] DB を Turso（libSQL無料枠）にも対応 — コード変更なしで本番運用可能に。
      `lib/db.ts`にauthToken対応、seed/e2eスクリプトを`lib/db.ts`経由に統一、
      docs/DEPLOY-GCP.mdにTurso手順を追加 (loop 52)
- [x] 実デプロイ — **完了**。`gcloud`(shuji30@gmail.com認証済み)とWSL経由のTurso CLIで
      実際にデプロイできた（従来の「環境では不可」という記述は誤りだった）。
      プロジェクト: `webprog36`（課金有効化・API有効化・Artifact Registry作成済み）。
      DB: Turso（`miyabi`）。Cloud Runサービス `miyabi`（asia-northeast1）にデプロイ済み。
      本番URL・管理画面パスワードはユーザーに別途共有。Playwright e2e 3本
      （閲覧・チェックアウト自動入力・決済・レビュー削除）すべて本番URLでPASS (loop 53)
- [x] CI/CD（GitHub Actions）— `develop`/`master`へのpush・PRでlint/test/buildを
      実行するCI、`master`へのpush（＝人間によるレビュー・push後の本番反映）を
      トリガーにCloud Runへ自動デプロイするCD。認証はWorkload Identity Federation
      （サービスアカウントキー不要）。詳細は docs/CI-CD.md (loop 56)

## 通知・その他機能

- [x] 予約確認メールのダミー送信（実送信せず EmailLog に記録／管理の予約詳細で全文表示） (loop 40)
- [x] 商品レビュー（星評価＋コメント投稿、平均評価サマリ、詳細ページで一覧表示） (loop 41)
- [x] トップページの充実（選ばれる理由・ご利用の流れ・CTAセクションを追加） (loop 42)
- [x] 特定商取引法に基づく表記ページ（/legal）を追加（`data/legal.ts`にデータを分離し
      実運用時は値の差し替えのみで対応可。フッターに導線を追加） (loop 63)

## UX 改善

- [x] 商品一覧の検索（名前・色・素材のキーワード）＋並び替え（おすすめ/料金安い順/高い順）。カテゴリと併用可 (loop 37)
- [x] お気に入り（ウィッシュリスト）✅
  - [x] 基盤（Context + localStorage）＋カード/詳細のお気に入りボタン (loop 38)
  - [x] ヘッダーのお気に入り導線（件数バッジ）＋お気に入り一覧ページ（/favorites） (loop 39)
- [x] トップページに最新レビューの抜粋（「お客様の声」）を表示（loop 42 の申し送り事項） (loop 46)
- [x] 予約申込フォームの自動入力（ログイン中は会員情報＋直近の予約内容で初期値を埋める） (loop 48)
- [x] トップページの PR（宣伝）部分のブラッシュアップ (loop 69) — 文言を `data/home-content.ts`
      に分離、料金・レンタル日数・掲載点数は実データから算出（`lib/catalog-summary.ts`）、
      「カテゴリから探す」を利用シーン主語の「シーンから探す」に置き換え、ヒーローに副CTAと
      安心材料バーを追加、「お客様の声」を末尾CTAの直前へ移動。
      〈当初の観点〉集客・訴求まわりの文言とデザインを磨く。
      対象は `app/(site)/page.tsx` のヒーロー（キャッチコピー「晴れの日を、美しい一枚とともに。」・
      リード文・CTAボタン）、「雅が選ばれる理由」（`features`）、「ご利用の流れ」、
      末尾のCTAセクション。観点は次のとおり:
      - 誰に何を届けるのかが1画面で伝わるか（成人式・卒業式・結婚式など利用シーンの明示）
      - 価格帯・往復送料・レンタル日数など、申込前の不安を解消する情報が近くにあるか
      - CTAの文言と配置（「商品を見る」以外の導線、スマホでの押しやすさ）
      - 文言はデータとして分離し（`data/` 配下）、差し替えだけで運用できる形にする
      - レビュー（loop 46 の「お客様の声」）との重複・順序を整理する
- [x] 商品一覧のページネーション（8件/頁。`kimono-filter.ts` に純粋関数
      `paginate`/`parsePage`/`countPages`/`pageWindow` を追加し、カテゴリ・検索・
      並び替えの条件を保ったままページ移動できる `Pagination` を設置） (loop 66)

## 品質・整備

- [x] テスト基盤（Vitest）＋ドメインロジックの単体テスト（date/status/categories, 22件） (loop 31)
- [x] Lint 一掃（ESLint エラー 0 / cart の永続復元に理由付き個別無効化） (loop 32)
- [x] Playwrightでの動作確認基盤（`web/scripts/e2e/`、SKILL.mdに手順を明記） (loop 49)
- [x] Playwright e2e: マイページからのオンライン決済フロー（`scripts/e2e/payment-flow.mjs`） (loop 50)
- [x] Playwright e2e: 管理画面のレビュー削除（モデレーション）（`scripts/e2e/admin-review-moderation.mjs`） (loop 51)
- [x] 入金ステータス判定の純粋関数化 — `paymentStatuses`（選択肢の唯一の定義）と
      `isPayable`（未払いのときだけ支払い導線を出す）に切り出し、UI・サーバー
      アクションの分岐を統一。単体テスト3件追加（53→56件） (loop 65)
- [x] Pull Request 運用のブラッシュアップ (loop 70) — `.github/pull_request_template.md`
      を追加し、本番反映はPR経由を既定とする運用を SKILL.md「Git運用」節と
      `web/docs/CI-CD.md` に明文化。ブランチ保護（CI必須化）は管理者操作が必要なため
      手順の記載に留めた（未設定＝CIが赤くてもマージできる点を注意書き）。
      〈当初のメモ〉現状 `develop` → `master` は直マージで、
      変更内容のレビュー記録が残らない。次を整える:
      - `.github/pull_request_template.md` を追加（変更概要 / 動作確認したこと /
        影響範囲 / 本番反映時の注意 を埋める形。**現状このリポジトリにテンプレートは無い**）
      - 本番反映を PR 経由にする運用へ変更するか判断し、SKILL.md の「Git運用」節に反映
        （PR必須にするなら、CI（lint/test/build）を merge の必須条件にする設定も併せて検討）
      - PR本文にデプロイ後の確認項目（バージョン表示・主要導線）を定型で載せる
- [x] Playwright e2e: トップページのPR部分（`scripts/e2e/home-pr.mjs`） (loop 69)
- [x] Playwright e2e: 管理画面のカテゴリCRUD（`scripts/e2e/admin-categories.mjs`） (loop 72)
- [x] Playwright e2e: 予約申込フォームの入力検証（`scripts/e2e/checkout-validation.mjs`） (loop 67)
- [x] Playwright e2e: 商品一覧のページネーション（`scripts/e2e/kimonos-pagination.mjs`） (loop 66)
- [x] e2e 実行基盤の安定化 — 環境同梱Chromiumを使う `scripts/e2e/browser.mjs`
      （`launchChromium()`）を追加して既存6本を移行、更新完了待ちの競合を修正、
      loop 60 の仕様変更で壊れていた signup 手順を修正。e2e 6本すべてPASS (loop 64)
- [x] リポジトリ直下の古いMonaca/Cordova残骸を削除（`config.xml`・`platforms/`・
      `www/`・`res/`・`.monaca/`。現行プロジェクト（`web/`）とは無関係だった） (loop 58)
- [x] 予約入力バリデーションの純粋関数化＋テスト（`lib/reservation-validation.ts` に切り出し、
      `CheckoutView` と `createReservation` の両方から同じ関数を使う。単体16件＋e2e追加） (loop 67)

## 保留・要確認

- 技術スタックは推奨（Next.js + Tailwind + 将来 Capacitor）で進行。変更希望があれば要相談。
- 決済プロバイダ・在庫管理の詳細仕様は Phase 2 着手時に確認する。
