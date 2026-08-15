# 履歴

ループごとの作業ログ。**新しいエントリを上に**追記する（追記式・削除しない）。
各エントリには「やったこと・結果・気づき／次への申し送り」を書く。

---

## loop 45 — GCP(Cloud Run) 公開の下準備（2026-08-15）

### やったこと
- 方針：サーバーレンダリングのため **Cloud Run（コンテナ）＋ Cloud SQL(PostgreSQL)** を採用。
- `next.config.ts`：`output:"standalone"` を有効化＋`outputFileTracingIncludes` で Prisma 生成クライアント（wasm等）をトレースに含める。
- `Dockerfile`（マルチステージ / node:22-slim）：builder で `npm ci`＋`next build`、runner は standalone＋static のみ・非rootユーザー・`$PORT`(8080)/`HOSTNAME=0.0.0.0` で `node server.js`。
- `.dockerignore`（node_modules/.next/.env/DB/tests/native 等を除外）。
- `docs/DEPLOY-GCP.md`：API有効化→Cloud SQL作成→provider=postgresql でマイグレーション→Cloud Build で push→`gcloud run deploy`（`--add-cloudsql-instances`＋Secret Manager）→更新運用。README/DEPLOYMENT から相互参照。

### 結果
- `next build` で `.next/standalone/server.js` 生成を確認。standalone サーバーを **Cloud Run と同じ起動方法**（`PORT`/`HOSTNAME` env, `node server.js`）でスモーク → `/`・`/kimonos` が 200（DB接続込み）。ESLint 0・テスト 53 件パス。

### 気づき・次への申し送り
- **本番 Postgres は provider を postgresql にして再ベースラインが必須**（DEPLOYMENT.md/DEPLOY-GCP.md に明記）。SQLite方言のマイグレーションはPostgresに流用不可。
- `docker build` と実デプロイ（gcloud）はこの環境では不可＝要 GCPプロジェクト/課金。Capacitor の `server.url` に Cloud Run の URL を入れればアプリも本番を指す。
- Cloud SQL 接続は Unix ソケット（`/cloudsql/PROJECT:REGION:INSTANCE`）方式で DATABASE_URL を構成。 — Capacitor 人間作業の手順書（2026-08-15）

### やったこと
- `docs/CAPACITOR-runbook.md` を追加。人間が自分の Mac/PC で行う作業を順序立てて記載：
  準備するもの（共通/iOS/Android）→ A.事前準備（Web公開・appId/server.url確定）→
  B.プロジェクト生成 → C.実機/エミュレータ確認（＋起動後チェックリスト）→
  D.ストア申請（iOS: Archive→App Store Connect / Android: keystore→AAB→Play Console）→
  E.公開後の更新運用（server.url方式＝Web再デプロイで反映、ストア再申請は基本不要）→ よくあるつまずき。
- `docs/CAPACITOR.md`（技術リファレンス）と README から runbook を相互参照。
- 併せて閲覧用に整形した HTML 手順書を Artifact として別途共有済み。

### 結果
- ドキュメント追加のみ（コード・テスト無影響）。既存のビルド/テスト状態は維持。

### 気づき・次への申し送り
- CAPACITOR.md=設定の技術リファレンス、runbook=作業の進め方、と役割を分離。
- 正式な appId（配布用逆ドメイン）と公開URLが決まれば capacitor.config.ts に確定反映する。

---

## loop 43 — Capacitor 導入の下準備（2026-08-15）

### やったこと
- 方針決定：本アプリは Server Actions/Prisma/Cookie認証を使うため `output:'export'` 不可。よって **`server.url` 方式**（ネイティブシェルが公開URLのサーバー版を WebView で表示）を採用。
- `@capacitor/core`・`@capacitor/cli`（v7.6.8）を導入。
- `capacitor.config.ts`（appId=jp.miyabi.kimono / appName=きものレンタル 雅 / webDir=native/www / server.url は手順化しコメントで雛形／cleartext でローカルIP確認可）。
- `native/www/index.html`：server.url 未設定時のオフライン用シェル（雅ブランドの接続中スプラッシュ）。
- npm scripts（cap:sync / cap:add:ios / cap:add:android / cap:open:*）、`.gitignore` に生成物 `/ios` `/android`、`docs/CAPACITOR.md`（前提・セットアップ・動作イメージ）、README から参照。

### 結果
- `npx cap sync` 成功（設定と webDir/シェルを認識）。ESLint 0・テスト 53 件パス・`next build` 成功（Web側は無影響）。ネイティブシェルの表示をブラウザ（モバイル幅）で確認。

### 気づき・次への申し送り
- **この環境の限界**：`cap add ios/android` と実機ビルドは macOS+Xcode / Android Studio+SDK が必要で、コンテナ内では生成・ビルド不可。手順は docs/CAPACITOR.md に集約。ios/android は生成物のため未コミット（.gitignore済み）。
- 実運用では `server.url` に本番URLを設定 → アプリはそのままサーバー版（カタログ〜決済〜マイページ）を表示。完全オフライン要件が出たら対象画面のみ静的化した別ビルドを webDir に置く設計を別途検討。
- 決定が必要な点：正式な appId（配布に使う逆ドメイン）と公開URL。決まればこちらで確定反映できる。 — トップページの充実（2026-08-15）

### やったこと
- トップページに3つのセクションを追加：
  - 「雅が選ばれる理由」（配送／サイズ・柄／クリーニングの3特長カード）
  - 「ご利用の流れ」（選ぶ→予約→受取→返却の4ステップ・番号付き）
  - 末尾のCTAバンド（「特別な一日に、特別な一枚を。」＋商品一覧への導線）
- コンテンツは静的配列（features/steps）で保持。既存パレット（kon/kin/washi/sumi）で統一。

### 結果
- ESLint 0・テスト 53 件パス・`next build` 成功。ブラウザでトップ全体を確認（ヒーロー→カテゴリ→注目商品→選ばれる理由→ご利用の流れ→CTA→フッター）。

### 気づき・次への申し送り
- 静的セクションのみでロジック追加なし（テスト増分なし）。次点として「お客様の声（最新レビューの抜粋）」をトップに出すとレビュー機能と連動して訴求力が上がる（別ループ候補）。 — 商品レビュー機能（2026-08-15）

### やったこと
- スキーマ: `Review`（kimonoId/name/rating/comment/createdAt, kimonoId にindex）＋マイグレーション。
- `lib/reviews.ts`（純粋）: `isValidRating`（1〜5整数）・`averageRating`（小数第1位丸め・無効値無視）＋単体テスト5件。
- `lib/review-repository.ts`: `getReviewsByKimono` / `getReviewStats`（件数・平均）。
- `lib/actions/review.ts`: `createReview`（評価・コメント検証、商品存在確認、ログイン中は表示名を会員名で補完、長さ制限）。
- `components/StarRating.tsx`（表示・読み取り専用）、`components/ReviewForm.tsx`（星選択＋投稿、成功時 `router.refresh()`）。
- 商品詳細に評価サマリ（価格下）＋レビュー一覧＋投稿フォームのセクション（`#reviews`）を追加。

### 結果
- ESLint 0・テスト **53 件パス**（+5）・`next build` 成功。ブラウザで4星/5星を投稿→平均4.5・2件が一覧とサマリに反映されることを確認。

### 気づき・次への申し送り
- レビューは投稿即時反映（revalidate）。将来スパム対策・購入者限定・管理からの非表示などを足す余地あり。カード一覧への平均表示は別ループで対応可能。
- 次はトップページの充実。 — 予約確認メールのダミー送信（2026-08-14）

### やったこと
- スキーマ: `EmailLog`（to/subject/body/kind/reservationId/createdAt）＋マイグレーション。
- `lib/mail-templates.ts`（純粋）: `reservationConfirmationEmail`（件名・本文を組み立て）＋単体テスト4件。
- `lib/mail.ts`（server-only）: `sendMail` はモック＝実送信せず EmailLog に記録＋ログ出力。実運用は SendGrid/SES 等にこの関数だけ差し替える継ぎ目。
- `createReservation` で予約保存後に確認メールを記録（try/catchで送信失敗は予約を失敗させない）。
- 管理の予約詳細に「送信メール」セクション（件名・宛先・日時・本文全文）を追加。`getEmailsByReservation` をリポジトリに追加。

### 結果
- ESLint 0・テスト **48 件パス**（+4）・`next build` 成功。ブラウザで実チェックアウト→予約作成→EmailLog に1件記録→管理詳細に確認メール全文表示を確認。

### 気づき・次への申し送り
- メールIDのみの疎結合（reservationId で紐付け）。将来、決済完了・キャンセルの通知メールも同じ `sendMail` で追加可能。
- 次は商品レビュー機能、その後トップページの充実。 — ヘッダーのお気に入り導線＋一覧ページ（2026-08-14）

### やったこと
- `components/FavoritesButton.tsx`: ヘッダーのお気に入りボタン（ハート＋件数バッジ、`/favorites` へ）。Header に設置（カートの左）。
- `components/FavoritesView.tsx`（クライアント）: お気に入りID×サーバー取得の全商品を突き合わせて登録順に表示。空状態の案内も用意。
- `app/(site)/favorites/page.tsx`（サーバー）: `getAllKimonos()` を渡すだけの薄いページ。

### 結果
- ESLint 0・テスト 44 件パス・`next build` 成功（/favorites ルート追加）。ブラウザ確認：カードで2件登録→ヘッダーバッジ「2」→`/favorites` に該当2件が表示。

### 気づき・次への申し送り
- お気に入りはこれで一通り完成（登録・永続化・件数バッジ・一覧）。将来ログイン連携でサーバー保存にする場合も Provider 内部だけ差し替えれば UI は不変。
- 外部依存の残タスク（実 Stripe / Capacitor）は方針待ち。 — お気に入り基盤＋カード/詳細のボタン（2026-08-14）

### やったこと
- `lib/favorites.tsx`: カートと同型の `FavoritesProvider`＋`useFavorites`（着物IDの配列を localStorage キー `miyabi-favorites` に永続化）。API: `ids/ready/has/toggle/remove/clear/count`。
- ルートレイアウトを `CartProvider > FavoritesProvider` でラップ。
- `components/FavoriteButton.tsx`: ハートのトグルボタン（overlay=カード上の丸ボタン / inline=詳細のラベル付き）。`<Link>` 内でも遷移しないよう `preventDefault`＋`stopPropagation`。
- ProductCard（画像右下にオーバーレイ）と商品詳細（カートの下にinline）に設置。

### 結果
- ESLint 0・テスト 44 件パス・`next build` 成功。ブラウザ確認：カードのハートをトグル→localStorage に `["furisode-hanakanzashi","houmongi-shikisai"]` 保存→リロード後もアクティブ2件、かつクリックしても遷移しない。

### 気づき・次への申し送り
- お気に入りは着物IDのみ保持し、表示データはページ側でDBと突き合わせる方針。次ループでヘッダーのお気に入り導線（件数バッジ）と `/favorites` 一覧ページを追加する。

---

## loop 37 — 商品一覧の検索・並び替え（2026-08-14）

### やったこと
- `lib/kimono-filter.ts`（純粋ロジック）: `filterKimonos`（名前・説明・素材・色をキーワード部分一致）、`sortKimonos`（おすすめ=取得順/料金安い順/高い順、元配列非破壊）、`applyKimonoQuery`、`isSortId`。件数が少ないため in-memory 処理で SQLite の照合差異を回避。
- `components/KimonoFilters.tsx`（クライアント）: カテゴリchip・検索フォーム・並び替えselectを `useRouter` で searchParams に反映（SSR で再取得）。
- 一覧ページ（サーバーコンポーネント）を `?category&q&sort` 対応に。件数表示に検索語を併記。
- 単体テスト `tests/kimono-filter.test.ts` を10件追加。

### 結果
- ESLint 0・テスト **44 件パス**（+10）・`next build` 成功。ブラウザ確認（「正絹」検索で6件、料金安い順で ¥5,500→¥32,000 に整列）。

### 気づき・次への申し送り
- 状態は URL（searchParams）に集約したので共有・ブックマーク可。カテゴリ×検索×並び替えを併用できる。
- 残りは実 Stripe 連携（要APIキー）と Capacitor アプリ化（要ネイティブSDK）。ユーザー方針待ち。

---

## loop 36 — ユーザー自身による予約キャンセル導線（2026-08-14）

### やったこと
- `lib/reservation-status.ts` に `isCancellable(status)`（受付=reserved のみ可）を追加＋単体テスト3件。
- `lib/actions/cancel.ts`: `cancelMyReservation(予約ID, セッション本人確認)` と `cancelReservationByLookup(受付番号+メール)`。どちらも受付状態のみキャンセル可。
- `components/CancelButton.tsx`（マイページ用, `window.confirm` 確認＋`router.refresh()`）。
- マイページに受付状態のときキャンセルボタンを表示（決済ボタンと操作エリアを統合）。予約照会（OrderLookup）にもキャンセルボタンを追加し、成功時はステータスをローカルで「キャンセル」に更新。

### 結果
- ESLint 0・テスト **34 件パス**（+3）・`next build` 成功。予約照会からのキャンセルをブラウザ確認（受付→確認ダイアログ→キャンセル済みバッジ・決済不可メッセージ・ボタン消滅）。

### 気づき・次への申し送り
- キャンセル可否は `isCancellable` に集約（受付のみ）。発送後の扱い（返送・返金）は運用要件次第。支払い済みのキャンセル時の返金処理は未実装（現状は paymentStatus をそのまま保持し、管理側で対応する想定）。
- 次は商品一覧の検索・並び替え（UX向上）。 — マイページに決済状況表示＋その場で決済（2026-08-14）

### やったこと
- `lib/actions/payment.ts` に `payMyReservation(reservationId)` を追加。受付番号+メールの代わりに**セッションで本人確認**（`getCurrentUser` の id と予約の userId 一致必須）。冪等・キャンセル済みは拒否。
- `components/PayNowButton.tsx`（クライアント）: 決済後に `router.refresh()` でサーバーコンポーネントを再取得し最新の決済状況を反映。
- マイページの各予約カードに PaymentBadge を表示し、未払い（かつ非キャンセル）なら「オンライン決済」ボタンを表示。

### 結果
- ESLint 0・テスト 31 件パス・`next build` 成功。ログイン済み会員でブラウザ確認（未払い→ボタン押下→支払い済みバッジに変化・ボタン消滅）。

### 気づき・次への申し送り
- ログイン導線では受付番号+メール入力が不要になり UX 改善。予約照会（未ログイン）用の `payReservation` と併存。
- 次は予約照会/マイページからのユーザー自身によるキャンセル導線を検討。

---

## loop 34 — 管理画面に決済状況を反映（2026-08-14）

### やったこと
- loop 33 で決済状況が管理の「予約詳細」にしか出ていなかったギャップを解消。
- `getReservationStats()` に入金集計（`paidCount` / `paidRevenue` = paymentStatus:"paid" の件数・合計）を追加。
- 管理の予約一覧に「入金」列（PaymentBadge）を追加。
- 管理ダッシュボードに「入金済み（n/N件）」「入金額（決済済み）」タイルを追加（4タイル構成、`lg:grid-cols-4`）。

### 結果
- ESLint 0・テスト 31 件パス・`next build` 成功。dev サーバー＋入金済み/未入金のデモ予約で表示を確認（一覧のバッジ、ダッシュボードの集計値が一致）。

### 気づき・次への申し送り
- 集計は `paymentStatus:"paid"` を基準に。キャンセル分の扱い（売上から除外するか）は運用要件次第で、必要ならさらにフィルタを足す。
- 残タスクは実 Stripe 連携と Capacitor アプリ化（いずれも外部依存）。

---

## loop 33 — オンライン決済（テストモード/モックゲートウェイ）（2026-08-14）

### やったこと
- スキーマ: `Reservation.paymentStatus`（"unpaid" | "paid", 既定 unpaid）を追加＋マイグレーション（`payment_status`）。
- `lib/payment.ts`: 決済ドメイン（ラベル/バッジ配色/型ガード）＋差し替え可能なモックゲートウェイ `processPayment`。取引IDは入力から決定的に生成（冪等・再現可能）。実運用は Stripe 等の API 呼び出しにこの関数だけ差し替える継ぎ目にした。
- `lib/actions/payment.ts`: `payReservation(受付番号+メール)` サーバーアクション。予約照会と同じく両一致必須・金額はDBの total を使用・すでに paid なら再課金しない（冪等）。成功時に管理/照会を revalidate。
- UI: 予約照会（OrderLookup）に決済バッジと「オンライン決済でお支払い」ボタンを追加（照会済みの受付番号+メールで決済）。キャンセル済みは決済不可。管理の予約詳細に決済バッジを表示。完了画面のコピーを更新。
- テスト: `tests/payment.test.ts`（型ガード・ラベル・モック決済の成否/決定性）を追加。

### 結果
- **テスト 31 件パス**（+9件）、ESLint エラー 0、`next build` 成功。DB スモーク（未払い→決済→支払い済み）確認。

### 気づき・次への申し送り
- Prisma7 は `migrate dev` 後もこの環境ではクライアント再生成が別途必要な場合があり、`prisma generate` を明示実行した（型不整合の解消）。
- 実 Stripe 連携（PaymentIntent、Webhook での確定、返金）と Capacitor アプリ化が残タスク。いずれも外部キー/ネイティブSDKが必要でこの環境だけでは完全検証不可のため、着手前にユーザー確認が要る。

## loop 32 — Lint 一掃（2026-08-11）

### やったこと
- `npm run lint` を実行。唯一のエラー（cart.tsx の localStorage 復元における effect 内 setState）を解消。
- 当該箇所は「SSR とのハイドレーション不整合を避けるためマウント時に一度だけ永続状態を読む」正当なパターンのため、理由コメント付きで `react-hooks/set-state-in-effect` を個別に無効化。

### 結果
- **ESLint エラー 0**。テスト22件パス・ビルド成功を維持。

### 気づき・次への申し送り
- 残タスクは決済(Stripe/要APIキー)と Capacitorアプリ化(要ネイティブSDK)で、いずれもこの環境だけでは完全検証不可。ユーザー判断待ち。

---

## loop 31 — テスト基盤＋ドメインロジックの単体テスト（2026-08-11）

### やったこと
- Vitest を導入（`vitest.config.mts`、`@` エイリアス、node 環境、`tests/**/*.test.ts`）。`npm test` を追加。
- 純粋ロジックの単体テストを作成（外部依存なし）:
  - `tests/date.test.ts`: addDays（月/年/うるう年跨ぎ）・rentalEndDate・latestReturnDate・formatJP・rangesOverlap（端接触/内包/離れ）。
  - `tests/reservation-status.test.ts`: isReservationStatus・statusLabel・全ラベル存在。
  - `tests/categories.test.ts`: 件数・ID一意・ラベル解決・未知ID。

### 結果
- **22件すべてパス**。ビルドも成功。バグの出やすい日付/期間/ステータスのロジックを回帰から保護。

### 気づき・次への申し送り
- server-only/prisma/next 依存のモジュール（auth/リポジトリ/アクション）は単体テスト対象外にし、純粋関数に絞って安定運用。必要なら将来 e2e/統合テストを別途。
- 残タスク: 決済(Stripe/要事業要件) / Capacitorアプリ化 / さらなる整理（lint徹底・型強化など）。

---

## loop 30 — 本番DB（Postgres）対応の下準備（2026-08-11）

### やったこと
- `@prisma/adapter-pg` / `pg` / `@types/pg` を導入。
- `lib/db.ts`: `DATABASE_URL` のスキームでアダプタを自動選択（postgres→PrismaPg / それ以外→PrismaLibSql）。SQLite（開発）は既定のまま。
- `docs/DEPLOYMENT.md`: Postgres 切替手順（provider 変更・マイグレーション再ベースライン・env・シード・ビルド）とデータ移植性（JSON文字列は両DBで動作）・サーバーレスの接続プール注意を記載。README から参照。

### 結果
- 型チェック・ビルド成功。SQLite 経路のスモークテスト（一覧・詳細が商品を返す）を確認。
- コードは provider 非依存化。**注意**: 本環境に Postgres サーバーが無いため、Postgres 実接続そのものは未実行（ドキュメントとコード準備まで）。実際の切替は provider を postgresql にして再マイグレーション/再生成が必要。

### 気づき・次への申し送り
- Prisma は provider がスキーマ静的なので、真の Postgres 稼働にはビルド時に provider=postgresql での再生成が必須（runtime のアダプタ切替だけでは方言が SQLite のまま）。この点を DEPLOYMENT.md に明記。
- 残タスク: 決済(Stripe/要事業要件) / Capacitorアプリ化。

---

## loop 29 — マイページ＋予約の紐付け（ユーザー認証 完了）（2026-08-11）

### やったこと
- スキーマ: Reservation.userId（任意, onDelete: SetNull）＋ User.reservations リレーション。マイグレーション。
- `createReservation`: ログイン中なら getCurrentUser で userId を予約に紐付け。
- `getReservationsByUser` を追加。`app/(site)/mypage/page.tsx`: 未ログインは /login へリダイレクト、会員情報＋予約履歴（ステータス/明細/返却期限/合計）を表示。
- ログイン/登録後の遷移を `/mypage` に変更。README に会員機能等のスコープを追記。

### 結果
- **ユーザー認証・マイページ完了**（loop 24, 27〜29）。E2E: 未ログイン→/login、登録→マイページ（空）、予約→マイページに履歴表示（会員 二郎 / 浴衣 金魚 / ¥5,500）、を確認。ビルド成功。

### 気づき・次への申し送り
- 予約はログイン時に userId で紐付き、非ログインでも従来通り受付番号＋メールで照会可能（両立）。
- 残タスク: 決済(Stripe/要事業要件) / 本番DB(Postgres)移行 / Capacitorアプリ化。

---

## loop 28 — ログイン/ログアウト＋ヘッダー状態（2026-08-11）

### やったこと
- `lib/actions/auth.ts` に login（照合失敗時はユーザー有無を推測されにくいメッセージ）と logout（destroySession→redirect）を追加。
- `components/LoginForm.tsx` / `app/(site)/login/page.tsx`: ログイン画面。
- `Header` を async 化し getCurrentUser でログイン状態を判定。ログイン時は「マイページ／ログアウト（form action）」、未ログイン時は「ログイン」を表示。

### 結果
- E2E: 登録→ヘッダーが「ログアウト/マイページ」表示、ログアウト→「ログイン」表示、誤りパスワード→エラー、正しい→再びログイン状態、を確認。ビルド成功。

### 気づき・次への申し送り
- Header が cookies() を読むため店舗フロントは動的レンダリングになる（認証表示のための妥当なトレードオフ）。
- ログイン/登録後の遷移は暫定で `/`。次ループでマイページ実装後 `/mypage` に変更する。
- 次ループ: マイページ（予約履歴）＋ Reservation.userId で予約とユーザーを紐付け。

---

## loop 27 — 認証基盤＋会員登録（2026-08-11）

### やったこと
- User / Session モデルを追加（マイグレーション）。
- `lib/auth.ts`（server-only）: Node `crypto` の scrypt でパスワードをソルト付きハッシュ化（"salt:hash"）＋ timingSafeEqual 照合。セッションはトークンをDB保存＋httpOnly Cookie。getCurrentUser / createSession / destroySession。
- `lib/actions/auth.ts`: register（バリデーション：メール形式・パスワード8文字以上・重複チェック→作成＋自動ログイン）。
- `components/SignupForm.tsx` / `app/(site)/signup/page.tsx`: 会員登録画面。

### 結果
- E2E: 登録→`/`へ遷移・httpOnly セッションCookie付与・DBにユーザー作成、パスワードは scrypt ハッシュ（平文でない）、重複拒否、を確認。確認用ユーザーはクリーンアップ。ビルド成功。

### 気づき・次への申し送り
- Playwright の `networkidle` 待機がこのページで詰まることがあり、`domcontentloaded` + `waitForURL` に変更して安定化（アプリ側は正常）。
- SignupForm は `/login`・`/mypage` へリンク済み（次ループで実装）。
- 次ループ: ログイン/ログアウト＋ヘッダーのログイン状態表示。

---

## loop 26 — 配送・返却フロー：ステータス更新（完了）（2026-08-11）

### やったこと
- `lib/actions/admin-reservation.ts`（"use server"）: updateReservationStatus。ステータス検証＋DB更新＋revalidatePath。/admin 配下から呼ばれ Basic 認証で保護。
- `components/StatusControl.tsx`（client）: 受付/発送済み/返却済み/キャンセルの切替ボタン。useTransition＋router.refresh() で即時反映。
- 管理詳細ページに「ステータス変更」セクションを追加。

### 結果
- **配送・返却フロー完了**（loop 25〜26）。E2E: 管理詳細で「発送済み」に変更→バッジ更新→一覧にも反映、を確認。ビルド成功。

### 気づき・次への申し送り
- ステータス更新は revalidatePath で一覧/詳細/ダッシュボードを再検証。予約照会（顧客側）も次アクセスで最新ステータスを表示。
- 残タスク: アカウント制ログイン / 決済(Stripe) / 本番DB(Postgres)移行 / Capacitorアプリ化。

---

## loop 25 — 配送・返却フロー：ステータス基盤と表示（2026-08-11）

### やったこと
- スキーマに `Reservation.status`（既定 "reserved"）を追加、マイグレーション適用。
- `lib/reservation-status.ts`: ステータス型・日本語ラベル・バッジ配色・フロー順・型ガード。
- `components/StatusBadge.tsx`: ステータスのバッジ表示。
- `lib/date.ts`: `latestReturnDate`（明細から最も遅い返却日＝返却期限）を追加。
- 管理一覧に「状態」列、管理詳細に状態バッジ＋返却期限、予約照会（lookup）にも状態＋返却期限を表示。

### 結果
- ビルド成功。既存予約は既定 "受付" 表示に。以降ステータスで配送・返却を追える下地ができた。

### 気づき・次への申し送り
- 現状は表示のみ（全件"受付"）。次ループで管理画面からのステータス更新（発送済み/返却済み/キャンセル）を実装して実際に遷移させる。

---

## loop 24 — 予約照会（マイページの第一歩）（2026-08-10）

### やったこと
- `lib/actions/lookup.ts`（"use server"）: 予約照会。**受付番号とメールの両方一致**を必須にし、不一致箇所は明かさず列挙/情報漏洩を防止。
- `components/OrderLookup.tsx`（client）: 照会フォーム＋結果表示（受付番号/氏名/日時/受取/明細/合計）。
- `app/(site)/orders/page.tsx`: 予約照会ページ。Footer に導線、Checkout 完了画面にも「予約照会」リンクを追加。

### 結果
- E2E: 誤ったメール→「見つかりません」、正しい組合せ→予約内容（山田 花子 / ¥18,000）表示、を確認。ビルド成功。

### 気づき・次への申し送り
- フル認証（アカウント制ログイン）は未実装。パスワードハッシュ/セッション等セキュリティ考慮が要るため別途大きめの loop で。まずは安全なゲスト照会を提供。
- 残タスク: アカウント制ログイン / 決済(Stripe) / 配送・返却 / 本番DB移行 / Capacitorアプリ化。

---

## loop 23 — 在庫カレンダー（貸出中期間の抑止）（2026-08-10）

### やったこと
- `lib/date.ts`: DateRange 型と rangesOverlap（YYYY-MM-DD は辞書順比較で日付判定）を追加。
- `lib/availability.ts`（server-only）: getReservedRanges（確定予約から貸出中期間を算出）/ isRangeAvailable（重複判定）。
- 商品詳細（`app/(site)/kimono/[id]`）: 貸出中期間を取得して AddToCartForm に渡す。**動的レンダリング（force-dynamic）に変更**し在庫を常に最新反映。generateStaticParams は撤去。
- `AddToCartForm`: 選択期間が貸出中と重複したら「貸出中」表示＋追加ボタン無効化。貸出中期間の一覧も表示。
- `lib/actions/reservation.ts`: 申込時にサーバー側でも `isRangeAvailable` を再チェックし**二重予約を防止**。

### 結果
- E2E: 貸出中期間の表示、重複開始日→エラー＋追加不可、空き日付→追加可、を確認。ビルド成功。

### 気づき・次への申し送り
- 在庫は「確定予約」ベースで判定（カート内の未確定分は競合対象外）。単一ユーザーのMVPでは十分。
- SSGからdynamicに変えたため詳細はDB参照が毎回入る。負荷が問題ならISR(revalidate)化を検討。
- 残タスク: ユーザー認証 / 決済(Stripe) / 配送・返却 / 本番DB移行 / Capacitorアプリ化。

---

## loop 22 — 管理画面のアクセス保護（管理画面 完了）（2026-08-10）

### やったこと
- `middleware.ts`: `/admin` 以下を HTTP Basic 認証で保護。資格情報は環境変数 ADMIN_USER / ADMIN_PASSWORD。
  - ADMIN_PASSWORD 未設定時は **fail-closed（全拒否）** とし、誤公開を防止。
- `.env` / `.env.example` に ADMIN_USER / ADMIN_PASSWORD を追加。README に管理画面と認証の記載を追記。

### 結果
- **管理画面（loop 19〜22）完了**。
- 検証（curl）: 未認証/誤り→401、正しい資格情報→200、店舗フロント(/ , /kimonos)は影響なし→200。ビルド成功。

### 気づき・次への申し送り
- Basic認証は簡易保護。将来「ユーザー認証・マイページ」でロール付きの本格認証へ拡張余地。
- ADMIN_PASSWORD は .env（gitignore）で管理し、コミットには含めない。.env.example はプレースホルダ。
- 残タスク: 在庫カレンダー / ユーザー認証 / 決済(Stripe) / 配送・返却 / 本番DB移行 / Capacitorアプリ化。

---

## loop 21 — 予約詳細＋ダッシュボード（2026-08-10）

### やったこと
- `app/admin/reservations/[id]/page.tsx`: 予約詳細（お客様情報＋レンタル明細＋合計）。notFound 対応。
- `app/admin/page.tsx`: ダッシュボード（予約件数・売上合計タイル＋最近の予約5件）。
- `lib/datetime.ts` を活用、明細の利用期間は date ヘルパーで表示。

### 結果
- スクショで一覧/ダッシュボード/詳細を確認（サンプル予約を3件に増やして表示確認）。ビルド成功。

### 気づき・次への申し送り
- 追加したサンプル予約は dev.db（gitignore）内のみで、コミットには含まれない。
- 次ループ: 管理画面のアクセス保護（Basic認証 middleware）。未保護のままにしない。

---

## loop 20 — 予約一覧（管理画面）（2026-08-10）

### やったこと
- `lib/reservation-repository.ts`: getReservations（明細件数付き）/ getReservationById / getReservationStats。
- `app/admin/layout.tsx`: 管理画面用ヘッダー（ダッシュボード/予約一覧/サイトへ）。
- `app/admin/reservations/page.tsx`: 予約一覧テーブル（受付番号/日時/氏名/受取/点数/合計/詳細リンク）。`dynamic = "force-dynamic"` で常に最新表示。
- `lib/datetime.ts`: 管理表示用の日時フォーマッタ。

### 結果
- 保存済みの予約が一覧表示されることを確認（curl で MYB-… / 山田 花子 を確認）。ビルド成功。

### 気づき・次への申し送り
- 次ループ: 予約詳細ページ（/admin/reservations/[id]）＋ダッシュボード（/admin 集計）。
- その後: 管理画面のアクセス保護（Basic認証）。

---

## loop 19 — レイアウト分離（route group 導入）（2026-08-10）

### やったこと
- 管理画面を店舗フロントと別レイアウトにするため route group を導入。
  - 店舗フロントのページ（page/kimonos/kimono/cart/checkout）を `app/(site)/` へ移動（git mv、URL は不変）。
  - `app/(site)/layout.tsx`: Header/Footer を担当。
  - ルート `app/layout.tsx`: html/body/フォント/CartProvider のみに整理（Header/Footer を除去）。

### 結果
- 表示・URL は変わらずビルド成功。以降 `app/admin/*` は独自レイアウトを持てる下地ができた。

### 気づき・次への申し送り
- 次ループ: 予約リポジトリ＋予約一覧ページ（/admin/reservations）と管理レイアウト。
- 管理画面はデータを閲覧できるため、後続ループで簡易アクセス保護（Basic認証）を必ず入れる。

---

## loop 18 — 予約をDBに永続化（バックエンド化 完了）（2026-08-08）

### やったこと
- `prisma/schema.prisma`: Reservation / ReservationItem モデルを追加、マイグレーション適用。
- `lib/actions/reservation.ts`（"use server"）: 予約申込のサーバーアクション。
  - 料金・商品名・レンタル日数はクライアント値を信用せず **DBから引き直して確定**（改ざん防止）。在庫・必須項目もサーバー検証。
  - 受付番号を採番し Reservation＋明細を作成、確定サマリを返す。
- `components/CheckoutView.tsx`: 送信をサーバーアクション呼び出しへ変更（送信中/エラー状態、完了はサーバー確定値を表示）。ローカル採番を廃止。
- `README.md`: DBセットアップ手順・スクリプト・構成・スコープを更新。

### 結果
- **「バックエンド化＋データ永続化」完了**（loop 16〜18）。
- E2E: 申込→受付番号 MYB-… を発行→DBに Reservation 1件＋明細（¥18,000, 山田花子, 配送）を保存、カート空、を確認。ビルド・型チェックOK。

### 気づき・次への申し送り
- Prisma 7 はスキーマ変更後に `prisma generate` が必要（migrate dev で自動再生成されない場合あり）。
- 未着手: 在庫カレンダー、ユーザー認証、決済(Stripe)、配送・返却フロー、本番DB(Postgres)移行、Capacitorアプリ化。
- 決済は事業要件の確認が必要。管理画面（予約一覧の閲覧）も将来的に有用。

---

## loop 17 — 商品ページをDB経由へ切替（2026-08-08）

### やったこと
- `app/page.tsx`（async 化）/ `app/kimonos/page.tsx` / `app/kimono/[id]/page.tsx` の商品取得を `@/data/kimonos` から `@/lib/kimono-repository`（DB経由・async）へ差し替え。
  - 一覧の絞り込みは getKimonosByCategory を使用。詳細の generateStaticParams は getAllKimonoIds（DBから）に変更。
- `data/kimonos.ts` はシードの情報源として存置。

### 結果
- ビルド成功。詳細10件はDBから SSG、トップもDBデータで静的生成、一覧は動的にDB配信。
- 検証: 起動サーバーに curl して一覧・カテゴリ絞り込み・詳細が商品名を返すことを確認（DB配信）。

### 気づき・次への申し送り
- SSGの詳細/トップはビルド時にDBを参照するため、デプロイ時は「マイグレーション＋シード後にビルド」する運用が必要（READMEに追記予定）。
- 次ループ: 予約をDBに永続化（Reservation モデル + サーバー送信）。checkout をサーバーアクション/APIへ。

---

## loop 16 — DB基盤（Prisma + SQLite）（2026-08-08）

### やったこと
- Prisma 7 + SQLite を導入。Prisma 7 は SQLite にドライバアダプタ必須のため **libSQL アダプタ**（@prisma/adapter-libsql + @libsql/client、プレビルドバイナリで native ビルド不要）を採用。
- `prisma/schema.prisma`: Kimono モデル（sizes/colors/images は SQLite に配列型が無いため JSON 文字列で保持）。
- `prisma migrate dev --name init` で初期マイグレーション＋DB作成。`prisma/seed.ts` で既存 data/kimonos.ts から10件投入（seeded: 10 確認）。
- `lib/db.ts`: PrismaClient シングルトン（libSQL アダプタ、HMR対策のグローバル使い回し）。
- `lib/kimono-repository.ts`: DB→ドメイン型 Kimono へ変換する取得関数群（getAll/ById/Featured/ByCategory/AllIds）。JSON列をパース。
- package.json に postinstall(prisma generate)/db:migrate/db:seed/db:reset。.gitignore に dev.db・生成物、.env.example は追跡。

### 結果
- 商品データがDBに永続化され、サーバー側から取得できる土台が完成。ビルド成功。ページはまだ静的データ利用（次ループで切替）。

### 気づき・次への申し送り
- Prisma 7 は `prisma.config.ts` 構成、生成クライアントは `lib/generated/prisma`（gitignore、postinstallで生成）。アダプタのエクスポート名は `PrismaLibSql`。
- DATABASE_URL は cwd(web/)基準の相対 `file:./dev.db` で CLI/ランタイム一致。
- 次ループ: 商品ページ群をリポジトリ経由（async）に切替え、静的 data 依存をシード専用に限定。

---

## loop 15 — 予約申込フォーム（2026-08-08）

### やったこと
- `components/CheckoutView.tsx`（client）: 予約申込フォーム。
  - 入力: 氏名(必須)/フリガナ/メール(必須・形式検証)/電話(必須)/受取方法(配送・店頭)/配送時は住所(必須)/備考。
  - クライアントバリデーション、注文内容サマリ、送信で受付番号を採番→カートを空にして完了画面表示。
- `app/checkout/page.tsx`: メタデータ付きページ。CartView の導線を「予約申込へ進む」→ /checkout に変更。
- Playwright E2E: 未入力で4エラー→正入力で受付番号発行→カートが空、を確認。

### 結果
- カタログ→カート→申込→受付完了まで通しで動作。ビルド・E2E OK。

### 気づき・次への申し送り
- ユーザーは次方向の選択に未回答。委任の流れと「外部要件不要」を理由に予約申込を既定として実装した。
- 決済(Stripe)は事業要件（決済事業者/返金/配送ポリシー）の確認が必要。着手時に要相談。
- 未着手: 在庫カレンダー、ユーザー認証、決済、配送・返却フロー、データ永続化、Capacitorアプリ化。

---

## loop 14 — カートページ（カート機能 完成）（2026-08-08）

### やったこと
- `lib/date.ts`: 日付ヘルパー（toISODate/addDays/rentalEndDate/formatJP）を共通化し、AddToCartForm もこれを利用するよう整理。
- `components/CartView.tsx`（client）: 明細一覧（画像/名前/サイズ/利用期間/料金/削除）、合計、空カート表示、カートを空にする。
- `app/cart/page.tsx`（server）: メタデータ＋CartView。
- Playwright で E2E 確認: 2点追加→合計¥34,000、バッジ「2」、削除・重複防止が期待通り。

### 結果
- **「カート＋レンタル期間選択」が完成**（loop 12〜14）。カタログ→サイズ/日程選択→カート確認まで一気通貫。ビルド・E2E OK。

### 気づき・次への申し送り
- 「予約手続きへ進む」はまだ準備中（決済/予約確定は要仕様）。
- 次フェーズ候補: (A) 在庫カレンダー（貸出中期間は開始日を選べない等）、(B) 予約フォーム（決済なしの申込→確認）、(C) 決済(Stripe)。決済は事業要件の確認が必要なので、まず (A) か (B) が進めやすい。着手前にユーザーへ方針確認。

---

## loop 13 — 商品詳細にカート追加フォーム（2026-08-08）

### やったこと
- `components/AddToCartForm.tsx`: サイズ選択＋レンタル開始日（date）＋「カートに追加」。
  - 開始日から利用期間（開始〜終了 / rentalDays日間）を自動計算して表示。
  - 貸出中は追加不可、既にカートにある組合せは重複追加を防止し「カートを見る」導線を表示。
- 商品詳細ページの旧「近日公開」ボタンをこのフォームへ置き換え。

### 結果
- 商品詳細から実際にカートへ追加できるようになった。ビルド成功。

### 気づき・次への申し送り
- 明細キーは「商品×サイズ×開始日」。同一商品でも条件が違えば別明細。
- 次ループ: カートページ（/cart）で明細一覧・削除・合計金額を表示。

---

## loop 12 — カートの基盤（Phase 2 開始）（2026-08-08）

### やったこと
- `lib/cart.tsx`: クライアント側カート（CartProvider / useCart）。localStorage で永続化。
  - CartItem（商品・サイズ・開始日・日数・料金）、addItem/removeItem/clear、count/total。
- `components/CartButton.tsx`: ヘッダーのカートアイコン＋件数バッジ。
- `Header` に CartButton を追加、`layout.tsx` を CartProvider で全体ラップ。

### 結果
- カートの土台ができた。ビルド成功。バックエンド無しでも件数が保持される。

### 気づき・次への申し送り
- 方針: MVP段階はサーバー無しのためクライアント永続化。将来サーバー/認証連携時に Provider 内部を差し替える（useCart の口は維持）。
- 次ループ: 商品詳細に「サイズ選択＋レンタル開始日選択＋カートに追加」フォームを追加。

---

## loop 11 — README 整備（Phase 1 完了）（2026-08-08）

### やったこと
- `web/README.md` を刷新：概要・技術スタック・起動方法・ディレクトリ構成・MVPスコープ・今後の予定・画像差し替え方法を記載。

### 結果
- **Phase 1（MVP: カタログ表示）が完了**。
  - MVPゴール達成: 一覧閲覧 / 詳細表示 / レスポンシブ / 将来アプリ化できる構成。
- ここまでの成果物: トップ・一覧（絞り込み）・詳細（SSG）の3画面と共通レイアウト。

### 気づき・次への申し送り
- 次フェーズ候補（Phase 2）: 決済・在庫・予約は仕様確認が必要。まずは「カート＋レンタル期間選択」あたりから着手が現実的。着手前に決済プロバイダ・在庫管理の要件をユーザーに確認する。
- 実写真・実データが用意できたら data/kimonos.ts と KimonoImage を差し替える。

---

## loop 10 — レスポンシブ確認と微調整（2026-08-08）

### やったこと
- 本番ビルドを起動し、Playwright（プリインストール Chromium）で mobile(390) / tablet(768) / desktop(1280) のスクショを取得。
- 確認: トップ／一覧／カテゴリ絞り込み／詳細。和の配色・青海波・家紋風モチーフが意図通り表示。
- 微調整: `ProductCard` の価格とサイズが狭い画面で衝突していたため、縦積み（価格→「サイズ …」）に変更。

### 結果
- スマホ〜PC で崩れなく表示されることを確認。MVP のゴール「レスポンシブ表示」を満たした。

### 気づき・次への申し送り
- スクショはスクラッチパッドに保存（リポジトリには含めない）。
- 次ループ: README 整備で Phase 1（MVP）を完了とする。

---

## loop 9 — 商品詳細ページ（2026-08-08）

### やったこと
- `app/kimono/[id]/page.tsx`: 商品詳細を実装。
  - パンくず、画像、価格、在庫状況、説明、スペック表（カテゴリ/サイズ/色/素材/期間）。
  - `generateStaticParams` で全商品を静的生成、`generateMetadata` でタイトル動的化。
  - MVP のため予約・決済ボタンは無効（「近日公開」）＋注記。

### 結果
- 10商品すべての詳細が SSG で生成。ビルド成功。カタログ表示のMVP機能が一通り揃った。

### 気づき・次への申し送り
- 次ループ: レスポンシブ実機確認（スクショ）＋見た目の微調整。
- その後: README 整備で Phase 1 完了予定。

---

## loop 8 — 商品一覧ページ（2026-08-08）

### やったこと
- `app/kimonos/page.tsx`: 商品一覧ページを実装。
  - カテゴリのチップで絞り込み（`?category=` クエリ、Next 16 の searchParams は Promise なので await）。
  - 該当件数の表示、0件時のメッセージ、レスポンシブグリッド（2〜4列）。

### 結果
- 一覧＋絞り込みが動作。ビルド成功（/kimonos は searchParams のため動的レンダリング）。

### 気づき・次への申し送り
- 次ループ: 商品詳細ページ `/kimono/[id]`（generateStaticParams で静的化）。

---

## loop 7 — トップページと共有カード（2026-08-08）

### やったこと
- `components/KimonoImage.tsx`: シードから決定的に和柄プレースホルダ画像を生成（グラデ＋青海波＋家紋風モチーフ）。実写真は後で差し替え。
- `components/ProductCard.tsx`: 商品カード（画像・カテゴリ・在庫バッジ・価格・サイズ）。詳細ページへリンク。
- `app/page.tsx`: トップページを実装（ヒーロー／カテゴリ導線／注目商品グリッド）。既定ボイラープレートを置き換え。

### 結果
- トップページが形になった。ビルド成功。

### 気づき・次への申し送り
- カテゴリ導線は `/kimonos?category=xxx` にリンク。次ループの一覧ページで絞り込みに対応させる。
- 次ループ: 商品一覧ページ（レスポンシブグリッド＋カテゴリ絞り込み）。

---

## loop 6 — 共通レイアウトとデザイン基調（2026-08-08）

### やったこと
- `app/globals.css`: 和のデザイントークンを Tailwind v4 の @theme で定義（washi/sumi/kon/kin/enji、和文フォント変数）。
- `app/layout.tsx`: Noto Sans JP / Noto Serif JP を導入、`lang="ja"`、サイトメタデータを設定。Header/Footer で全ページを囲む構成に。
- `components/Header.tsx`: ブランド「雅」＋グローバルナビ（ホーム/商品一覧）、sticky ヘッダー。
- `components/Footer.tsx`: ブランド説明・ナビ・コピーライト。

### 結果
- 全ページ共通の見た目の土台ができた。ビルド成功（Noto フォント取得含む）。

### 気づき・次への申し送り
- サイト名は「きものレンタル 雅（みやび）」で仮設定。変更希望があれば差し替え。
- 既定の app/page.tsx はまだボイラープレート。次ループのトップページで置き換える。
- 次ループ: トップページ（ヒーロー＋注目商品）。共有の ProductCard / プレースホルダ画像コンポーネントもここで作る。

---

## loop 5 — サンプル商品データの作成（2026-08-08）

### やったこと
- `web/data/kimonos.ts`: 全6カテゴリにわたるサンプル商品10点を作成。
  - 注目商品(featured)・在庫切れ(inStock=false)の例も含め、UI検証に使えるようにした。
- 取得関数（getAllKimonos / getKimonoById / getFeaturedKimonos）を用意。

### 結果
- ページから参照できる商品データが揃った。`tsc --noEmit` OK。

### 気づき・次への申し送り
- 将来的には DB / ヘッドレスCMS へ移行する前提（ファイル冒頭コメントに明記）。
- 次ループ: 共通レイアウト（ヘッダー/フッター/ナビ）とデザインの基調づくり。

---

## loop 4 — 商品データモデルの定義（2026-08-08）

### やったこと
- `web/lib/types.ts`: 着物のドメイン型を定義（Kimono / KimonoCategory / KimonoCategoryId）。
  - 項目: 名前・カテゴリ・レンタル料・レンタル日数・サイズ・色・素材・説明・画像・在庫・注目フラグ。
- `web/lib/categories.ts`: カテゴリ6種（振袖/訪問着/留袖/付け下げ/袴/浴衣）のメタデータと参照関数。

### 結果
- 商品を表現する型が固まり、サンプルデータ・ページ実装の土台ができた。`tsc --noEmit` OK。

### 気づき・次への申し送り
- MVP では画像は実写真の代わりに「シード文字列→プレースホルダ生成」で表示する方針（型のコメントに明記）。実写真は後で差し替え。
- 次ループ: サンプル商品データ（JSON/TS）の作成。

---

## loop 3 — プロジェクト雛形のセットアップ（2026-08-08）

### やったこと
- `web/` に Next.js プロジェクトを作成（既存の Monaca/Cordova 雛形と分離）。
  - 構成: Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS 4 / ESLint、import alias `@/*`。
- `npm run build` で本番ビルドが成功することを確認。
- `.gitignore` で node_modules / .next が除外されることを確認（コミット対象はソースのみ）。

### 結果
- ビルド可能な Web アプリの土台ができた。以降のページ実装ループに入れる。

### 気づき・次への申し送り
- 既定のボイラープレート（app/page.tsx 等）は残置。次段以降の「共通レイアウト」「トップページ」で置き換える。
- create-next-app が生成した web/CLAUDE.md・web/AGENTS.md はそのまま残置。
- 次ループ候補: 「商品データモデルの定義」または「共通レイアウト」。データ構造を先に決めるとページ実装が楽なので、データモデル→サンプルデータの順を推奨。

---

## loop 2 — 目的の確定とロードマップ分解（2026-08-08）

### やったこと
- 目的を確定：**着物レンタルのECサイト**（レスポンシブWeb＋将来アプリ対応 / MVPはカタログ表示のみ）。
- 技術スタックを決定：Next.js (App Router) + TypeScript + Tailwind CSS、将来のアプリ化に Capacitor。
- SKILL.md の「目的」「ゴール」を記入（MVPのゴールを検証可能な条件で定義）。
- ROADMAP.md を EC サイト向けに再構成し、Phase 1（MVP: カタログ表示）を実タスクへ分解。Phase 2 以降（カート・決済・アプリ化等）も整理。

### 結果
- 目的・ゴール・ロードマップが揃い、実装ループ（Phase 1）に入れる状態になった。

### 気づき・次への申し送り
- ユーザー回答：形態=レスポンシブWeb＋アプリ両対応 / MVP=カタログ表示のみ / スタック=推奨に一任。
- 次ループ候補: Phase 1 の先頭「プロジェクト雛形（Next.js + TS + Tailwind）のセットアップ」。
- 実装に入る前に、ロードマップ（特に Phase 1 の並び）でよいかユーザーに一度確認する。

---

## loop 1 — 骨子スキルの作成（2026-08-08）

### やったこと
- `loop-instruction` スキルの SKILL.md を作成。
  - 目的（後日追記のプレースホルダ）、ゴール、禁止事項を定義。
  - あわせて「1ループの定義」「ループの実行手順」「コミット規約」「終了条件」を追記。
- ROADMAP.md / HISTORY.md の雛形を作成し、このスキル自身の開発追跡に使う運用とした。

### 結果
- 骨子が揃い、以降は1ループ1コミットで反復できる状態になった。

### 気づき・次への申し送り
- **目的が未確定**。ユーザーが後日追記する予定。埋まるまではゴールの具体化を保留する。
- 目的が入ったら、まずゴールを検証可能な条件へ落とし込み、ROADMAP へタスク分解する。
