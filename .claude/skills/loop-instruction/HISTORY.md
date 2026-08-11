# 履歴

ループごとの作業ログ。**新しいエントリを上に**追記する（追記式・削除しない）。
各エントリには「やったこと・結果・気づき／次への申し送り」を書く。

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
