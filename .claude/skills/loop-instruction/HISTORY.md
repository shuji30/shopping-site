# 履歴

ループごとの作業ログ。**新しいエントリを上に**追記する（追記式・削除しない）。
各エントリには「やったこと・結果・気づき／次への申し送り」を書く。

---

## loop 75 — CDが Environment secrets を読めていなかったのを修正（2026-08-21）

### 何が起きたか
- loop 74（マイグレーション自動化）を本番反映したところ、CD が
  「TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が必要です」で停止した（run #10）。
- ログでは3つとも空:
  ```
  TURSO_DATABASE_URL:
  TURSO_AUTH_TOKEN:
  BASELINE:
  ```
- 原因は、認証情報が **Environment `shopping-site-db` の secrets** に登録されていた
  のに対し、deploy ジョブに `environment:` の指定が無かったこと。
  `environment:` を指定しないジョブからは Environment secrets は参照できず、
  空文字になる（エラーにはならない）。

### やったこと
- `.github/workflows/deploy.yml`: deploy ジョブに `environment: shopping-site-db` を追加。
- `docs/CI-CD.md`: 置き場所が Environment であることと、その理由を明記。

### 気づき
- **設計としては、止まったのは正しい挙動だった。** loop 74 で
  「Secrets 未設定ならスキップせず失敗させる」と決めたとおりに動き、
  マイグレーションが走らないままデプロイされることを防いだ。本番は前の
  リビジョン（0.9.2）のままで、壊れたコードは出ていない。
- 一方で**切り分けに手間取った**。エラーメッセージが「両方必要です」としか言わず、
  どちらが空か・Environment と Repository のどちらを見ているかが分からなかった。
  最終的にユーザーの設定画面のスクリーンショットで判明した。
- 私が最初に「Repository variables に置いてください」と案内したのは、当時の
  ワークフローに `environment:` が無かったので正しかったが、**実際の置き場所を
  確認せずに案内だけして進めた**のは loop 73 の反省（「手順を渡した」は
  「適用された」ではない）と同じ構造。設定の所在は推測せず確認すべきだった。

### その後（同ループ内・run #11）
- `environment:` 追加後の再デプロイでは**マイグレーションステップは通った**が、
  次の Docker push で `denied: Unauthenticated request` で失敗した。原因は権限ではなく
  ネットワーク由来の一過性障害:
  ```
  ERROR: (gcloud.auth.docker-helper) There was a problem refreshing your current auth tokens:
  ('Unable to retrieve Identity Pool subject token',
   'upstream connect error or disconnect/reset before headers. ... connection timeout')
  ```
  `google-github-actions/auth@v2` の既定方式は、認証トークンを**使うたびに**
  GitHub の OIDC エンドポイントへ取りに行く。その通信が push の瞬間に切れ、
  gcloud が未認証扱いになった。**失敗ジョブを1回再実行して success**（attempt 2）。
- これで **マイグレーション自動化が初めて本番で動いた**（バージョン 0.11.2）。
- **障害は収束**（ユーザー確認、2026-08-21）。トップページが表示されるようになり、
  loop 71-72 の反映で全ページ500になっていた状態が解消した。
  `Category` テーブルとカテゴリデータが本番に揃ったことになる。

### 次への申し送り
- スクリプトのエラーメッセージを「どちらの変数が空か」個別に出す形にすると、
  次回の切り分けが早い。小さいので次のループで対応する。
- 上記の OIDC タイムアウトは**また起きる**。`token_format: 'access_token'` で
  auth ステップの時点でトークンを確定させる恒久対策を ROADMAP に起票した。

---

## loop 74 — 本番マイグレーションをCDで自動適用する（2026-08-21）

### 経緯
- loop 73 で最優先に起票した再発防止策。loop 71-72 の反映で本番が全ページ500に
  なった直接の原因は「CDがマイグレーションを実行しない」ことだったので、そこを塞ぐ。

### やったこと
- `lib/migration-sql.ts`（新規・純粋関数）: `toHttpUrl`（libsql:// → https://）、
  `splitSqlStatements`（行コメント除去＋`;`分割）、`sortMigrationNames`、
  `selectPending`、`resolveBaseline`。
- `scripts/migrate-turso.mjs`（新規）: Turso の HTTP API（`/v2/pipeline`）を fetch で
  直接叩き、未適用の migration.sql を順に適用する。**turso CLI も Prisma の
  libsql 対応も不要**（`prisma migrate deploy` は `libsql://` を扱えない）。
  適用済みは `_applied_migrations` 台帳で管理。`--dry-run` あり。
- `.github/workflows/deploy.yml`: `gcloud run deploy` の**前**に上記を実行。
  **失敗すれば非0で止まり、デプロイは走らない**。
- `tests/migration-sql.test.ts`: 16件追加（116→132件）。
- `docs/CI-CD.md`: 仕組みと、人間が一度だけ行う設定（Secrets/Variables）を記載。

### 設計判断
- **初回のベースラインを必須にした**。既存DBには9件が適用済みだが台帳は空なので、
  素直に全件流すと `CREATE TABLE "Kimono"` が既存テーブルに衝突して失敗する。
  `TURSO_MIGRATION_BASELINE` で「ここまで適用済み」を宣言させ、その分は
  **実行せず記録だけ**する。未指定かつ台帳が空なら意図的に停止する
  （黙って全件流すほうが危険なため）。打ち間違いも例外にして弾く。
- **Secrets 未設定なら失敗させる**（スキップしない）。スキップすると loop 71-72 と
  同じ事故が再発する。失敗してもデプロイが止まるだけで本番は無傷なので、
  こちらのほうが安全側。

### 検証
- 実際の Turso には接続できない（この環境に turso CLI が無く、`*.turso.io` へも
  到達できない）。代わりに **`/v2/pipeline` をモックしたHTTPサーバーを立てて
  スクリプト全体を通した**。確認した5通り:
  1. 台帳が空＋baseline未指定 → exit 1 で停止
  2. baseline が打ち間違い → exit 1（候補一覧を表示）
  3. baseline=password_reset_tokens → 9件を記録のみ・categories だけ適用 → exit 0
  4. 2回目の実行 → 「未適用なし」で exit 0（冪等）
  5. 適用SQLが失敗 → exit 1。落ちたSQLを表示してデプロイを中止
- ESLint 0・vitest 132件パス・`next build` 成功。

### 気づき・次への申し送り
- **この変更自体は、Secrets を登録するまで本番反映できない**（登録前にマージすると
  CDがマイグレーションステップで失敗する）。それは意図した挙動で、
  「設定漏れに気づかないままデプロイされる」よりよい。PRの「本番反映時の注意」に明記した。
- モックでの検証は実接続の代わりにならない。初回のCD実行は必ずログを見ること。
- 実接続を伴う検証手段が無いのは変わっていないので、ROADMAP の
  「スキーマ変更を含む反映の事前チェック」は残したままにしてある。

---

## loop 73 — 本番障害の記録とマイグレーション自動化の起票（2026-08-21）

### 何が起きたか
- loop 71-72（カテゴリのDBマスタ化＋管理CRUD）を PR #5 で本番反映したところ、
  **本番サイトが全ページ500（"This page couldn't load"）になった**。
  原因は、本番DB（Turso `miyabi`）に `Category` テーブルが無いまま新コードが動いたこと。
  トップ・商品一覧・商品詳細のいずれもカテゴリを読むため、全滅した。

### なぜ防げなかったか
- **CD がマイグレーションを実行しない**。`deploy.yml` は Docker build → `gcloud run deploy`
  のみで、コンテナの `CMD` も `node server.js`。Dockerfile 冒頭に
  「マイグレーション適用はこのイメージには含めず、デプロイ手順側で別途実行する」と
  書かれているが、**その「デプロイ手順側」が用意されていなかった**。
- 反映前に「Turso への適用が先に必要」とユーザーへ伝え、`turso db shell miyabi <
  migration.sql` の手順を渡した。ユーザーから「実行した」と回答を得たので反映したが、
  実際にはテーブルが作られていなかった（リダイレクトが効かなかった可能性が高い）。
- **こちらから適用結果を検証できなかった**のが決定的。この環境には turso/gcloud CLI が無く、
  本番URLへの接続もエグレスポリシーで403拒否される。「適用したか」を自己申告に頼る形になり、
  失敗を検知できないままマージした。

### 対応
- 切り戻しは行わなかった（ユーザー判断。本稼働前のため）。
- 復旧は DB 側で行う方針とし、`CREATE TABLE IF NOT EXISTS` と `INSERT OR IGNORE` を
  **引数で直接渡す形**（リダイレクトを使わない）の手順を渡した。アプリは毎リクエスト
  DBを読むので、テーブルができれば再デプロイなしで復旧する。
- ROADMAP「デプロイ・インフラ」に最優先で2件を起票（本記録の目的）:
  1. 本番マイグレーションの自動化（CDに組み込み、失敗したらデプロイ中止）
  2. スキーマ変更を含む反映の事前チェック手段

### 気づき・次への申し送り
- **「手順を渡した」は「適用された」ではない**。検証できない前提条件の上に本番反映を
  積むべきではなかった。自動化するか、少なくとも適用結果を機械的に確認できるように
  してから、スキーマ変更を含む反映を行うこと。
- PRテンプレート（loop 70）には「DBマイグレーション: あり/なし」欄を作ったが、
  **書く欄があっても、実行と検証の仕組みが無ければ事故は防げない**。

---

## loop 72 — 管理画面でカテゴリマスタを登録・変更・削除（2026-08-20）

### 経緯
- loop 71 でDBマスタ化した土台の上に、ユーザー要望の CRUD を載せる。

### やったこと
- `lib/category-validation.ts`（新規・純粋関数）: `validateCategory`（新規/変更で
  モードを分ける）、`isValidCategoryId`、`parseSortOrder`、`firstCategoryError` ほか。
  予約フォーム（loop 67）と同じ方針で、判定と文言をクライアント・サーバーで共有する。
- `lib/actions/admin-category.ts`（新規）: `createCategory` / `updateCategory` /
  `deleteCategory`。検証・重複チェック・削除可否をサーバー側でも必ず行い、
  成功時は `/admin/categories`・`/kimonos`・`/` を revalidate する。
- `components/CategoryManager.tsx`（新規・クライアント）: 一覧＋行内編集＋新規追加。
  削除は `window.confirm` を挟み、商品が紐づく行はボタン自体を disabled にする。
- `app/admin/categories/page.tsx`（新規）: `groupBy` で商品数を1クエリにまとめて取得。
  マスタに無い識別子が商品に残っていれば警告を出す。
- `app/admin/layout.tsx`: ヘッダーに「カテゴリ管理」を追加。
- `tests/category-validation.test.ts`（新規, 15件）。101→116件。
- `scripts/e2e/admin-categories.mjs`（新規）: 登録→店舗側の絞り込みに出る→
  識別子の重複拒否→変更→店舗側にも反映→商品ありは削除不可→商品なしは削除できて
  店舗側からも消える、を通しで確認。

### 設計判断
- **識別子（id）は登録後に変更できない**。商品の `category` 列と、共有済みの
  絞り込みURL（`?category=…`）が壊れるため。付け替えたいときは新規作成して
  商品を移す運用にし、画面にもその旨を出した。
- **商品が紐づくカテゴリは削除不可**。消すと商品のカテゴリが宙に浮き、一覧の
  絞り込みから辿れなくなる。UIでボタンを無効化しつつ、サーバー側でも件数を見て拒否する。
- 表示順は10刻みを既定にした（後から間に挟める）。新規追加時は「最大値+10」を初期表示。

### 結果
- ESLint 0・`tsc --noEmit` エラー0・vitest 116件パス・`next build` 成功
  （`/admin/categories` ルートが追加されている）。
- `npx tsx scripts/e2e/admin-categories.mjs` **PASS**（5項目すべて確認）。
- スクリーンショットで一覧・追加フォームの表示を確認。

### 気づき・次への申し送り
- **本番反映には Turso へのマイグレーション適用が先に必要**（loop 71 の申し送りと同じ）。
  この環境に `turso` CLI が無いためユーザー作業。適用せずデプロイすると
  `Category` テーブルが無く、トップ・一覧・管理画面が落ちる。
- 商品側のカテゴリ変更UIはまだ無い（商品マスタの管理画面が未実装）。
  「商品が紐づくカテゴリを削除したい」ときは現状DBを直接触るしかないので、
  商品マスタのCRUDが次の自然な候補。

---

## loop 71 — 商品カテゴリをDBマスタ化（挙動不変）（2026-08-20）

### 経緯
- ユーザー要望「商品カテゴリマスタを登録・変更・削除できるようにして欲しい」。
  管理画面のCRWDまで一度に入れると1コミットに複数の関心事が混ざるため、
  **①DBマスタ化（このループ・挙動不変）→ ②管理画面のCRUD** の2ループに分けた。
  ROADMAP にも2段で起票済み。

### やったこと
- `prisma/schema.prisma`: `Category` モデル（id / label / description /
  sortOrder / createdAt）。マイグレーション `20260820164502_categories`。
- `data/categories.ts`（新規）: 初期6件。**実行時は参照せず seed 専用**
  （実データはDBが正）。`prisma/seed.ts` で upsert（既存行は上書きしない＝
  管理画面での編集を消さない）。
- `lib/category-repository.ts`（新規・server-only）: `getCategories`（sortOrder→id順）
  `getCategoryById` `getCategoryLabelMap` `countKimonosInCategory`（削除可否判定用）。
- `lib/categories.ts`: ハードコード配列を撤去し、**DBから取った配列を受け取る
  純粋ヘルパ**に作り替え（`findCategory` `getCategoryLabel` `sortCategories`
  `nextSortOrder`）。
- `lib/types.ts`: `KimonoCategoryId` をユニオン型から `string` へ（管理画面から
  自由に追加できるため固定できない）。`Kimono` に `categoryLabel` を追加。
  seed 用に `KimonoSeed = Omit<Kimono, "categoryLabel">` を新設。
- `lib/kimono-repository.ts`: 取得時にカテゴリマスタを引いて `categoryLabel` を埋める。
- `ProductCard` / 商品詳細: `getCategoryLabel(...)` の呼び出しを `kimono.categoryLabel` に置換。
- 商品一覧ページ: カテゴリをDBから取得し `KimonoFilters` に props で渡す。
  URLに存在しないカテゴリIDが来たら「すべて」として扱う。
- `data/kimonos.ts`: loop 17 以降どこからも呼ばれていなかった `getAllKimonos` /
  `getKimonoById` / `getFeaturedKimonos` を削除（参照は seed の `kimonos` のみ）。
- `tests/categories.test.ts` を新ヘルパ向けに書き直し（94→101件）。

### 気づき
- **`ProductCard` はクライアントコンポーネント（`FavoritesView`）からも使われる**ため、
  カテゴリ名をその場でDBから引く実装にはできなかった。商品オブジェクトに
  `categoryLabel` を持たせて運ぶ形にしたことで、同期/非同期の問題が消えた。
- マスタに無い識別子（カテゴリ削除後の商品など）は**識別子をそのまま表示**する
  フォールバックにした。空欄より原因が分かりやすい。

### 結果
- ESLint 0・`tsc --noEmit` エラー0・vitest 101件パス・`next build` 成功。
- 既存 e2e（`home-pr` / `kimonos-pagination`）ともに **PASS**＝挙動は変わっていない。

### 気づき・次への申し送り
- **本番（Turso）へのマイグレーション適用が別途必要**。この環境には `turso` CLI が
  無いためユーザー作業になる（手順は `web/docs/DEPLOY-GCP.md`）。適用前に
  デプロイすると `Category` テーブルが無く、トップ・一覧が落ちる。
- 次ループで `/admin/categories` のCRUDを載せる。削除は
  `countKimonosInCategory` が0のときのみ許可する方針。

---

## loop 70 — Pull Request 運用のブラッシュアップ（2026-08-19）

### 経緯
- loop 68 で起票した2件のうち残っていた方。あわせて、loop 69 の本番反映のときに
  **ユーザーが PR #3 を作って develop → master をマージしていた**ことが分かり、
  実運用が既にPR経由へ動いていた。それに追随して明文化する。

### やったこと（ドキュメント・テンプレートのみ・コード変更なし）
- `.github/pull_request_template.md`（新規）: 概要／変更点／動作確認したこと
  （lint・test・build・e2e・見た目のチェックリスト）／影響範囲（DBマイグレーションの
  有無を明示）／本番反映時の注意／デプロイ後の確認（CDのsuccess・バージョン表示・
  主要導線）。埋める枠として書き、該当しない節は削除してよい旨を先頭コメントに記載。
- `web/docs/CI-CD.md`: 「本番反映は Pull Request 経由を既定とする」節を追加。
  理由（何を出したかが残る／CIを1か所で確認できる／切り戻し単位が明確）と
  `gh pr create` の例を記載。あわせて **ブランチ保護が未設定である**ことと、
  `master` に Require status checks を設定する手順を明記した。
- SKILL.md「Git運用」節: 上記をルールとして追記。急ぎ等でユーザーが直マージを
  指示した場合は従ってよい、という既存の方針は残した。

### 気づき
- PR #3 の本文は、テンプレートが無かったためコミットメッセージのコピーだった。
  「動作確認したか」「反映時の注意」はコミットメッセージに書く情報ではないので、
  テンプレートが無いと構造的に抜け落ちる。
- **CI必須化はコードでは完結しない**（GitHubのブランチ保護＝管理者操作）。
  設定しない限り「CIが赤くてもマージできる」ため、SKILL.md 側に
  「マージ前にCIを目視確認する」という運用でのカバーを書いた。

### 結果
- ESLint 0・vitest 94件パス・`next build` 成功（ドキュメント変更のみで挙動は不変）。

### 気づき・次への申し送り
- **ROADMAP の実行可能な残タスクは再びゼロ**。残るのは
  「Capacitor の ios/android 実機ビルド」（macOS+Xcode / Android Studio が必要で
  この環境では不可）のみ。
- 次にこのループで何かを本番へ出すときは、**自分で直マージせず PR を作って
  ユーザーに渡す**のが新しい既定。ただしPR作成は明示指示があったときに行う。
- ブランチ保護の設定はユーザー（リポジトリ管理者）の作業として残っている。

---

## loop 69 — トップページの PR（宣伝）部分をブラッシュアップ（2026-08-19）

### 経緯
- loop 68 で起票した2件のうち、ROADMAP上から順で先に来る「UX 改善」側に着手。

### やったこと
- `data/home-content.ts`（新規）: ヒーロー・安心材料・シーン・選ばれる理由・
  ご利用の流れ・末尾CTA の文言を `legal.ts` と同じ方針でデータ化。
  **金額と日数は持たせない**（商品を足したときに嘘になるため）。
- `lib/catalog-summary.ts`（新規・純粋関数）: `summarizeCatalog`（件数と価格・日数の
  最小最大）、`formatPriceRange`、`formatDaysRange`、`fillCatalogNote`
  （`{count}`/`{price}`/`{days}` を実データで差し込む）。
- `app/(site)/page.tsx`:
  - ヒーローに「レンタル料 ¥5,500〜¥32,000 ｜ ご利用 2〜4日 ｜ 往復送料込み」を追加。
    値はDBから算出するので商品を増やしても追従する。
  - 副CTA「ご利用の流れを見る」（`#flow`）を追加。スマホでは縦積み＋全幅にして押しやすくした。
  - ヒーロー直下に安心材料バー（配送・返却／キャンセル／お支払い）を新設。
  - **「カテゴリから探す」を「シーンから探す」に置き換え**。成人式→振袖、卒業式→袴…と
    利用シーンを主語にし、カテゴリ名はバッジで併記。カテゴリと1対1なので情報は減っていない。
  - **「お客様の声」をご利用の流れの後・末尾CTAの直前へ移動**（申込を促す直前に社会的証明を置く）。
  - 末尾CTAに「現在 10 点を掲載中。レンタル料 …／…日 のご利用です。」を追加。
  - スマホで h1 が3行に折れていたので `text-4xl` → `text-3xl sm:text-5xl`。
- `tests/catalog-summary.test.ts`（新規, 10件）／`scripts/e2e/home-pr.mjs`（新規）。

### 気づき
- 「カテゴリ」と「シーン」を別セクションで並べると重複するが、**カテゴリが1対1で
  シーンに対応していた**ので、置き換えるだけで重複せずに訴求力だけ上げられた。
- e2e で「お客様の声」の並び順を検査するにはレビューが1件以上必要。seed にレビューが
  無いため、スクリプト内で一時レビューを作り `finally` で消す形にした。
- 金額をデータファイルに書かず実データから出す方針にしたので、商品追加時に
  トップページの記載が古くなる事故が起きない。e2e でもDB値と画面表示の一致を確認している。

### 結果
- ESLint 0・vitest **94件パス**（84→94）・`next build` 成功。
- `npx tsx scripts/e2e/home-pr.mjs` **PASS**（料金・日数の一致／セクション順／副CTAの
  アンカー遷移／シーン6件のカテゴリ遷移／掲載点数の一致）。
- PC・スマホ（390px）のスクリーンショットでレイアウト崩れが無いことを確認。

### 気づき・次への申し送り
- 残タスクは「Pull Request 運用のブラッシュアップ」（loop 68 で起票）と
  「Capacitor の実機ビルド（この環境では不可）」。
- 本番反映は未実施（loop 68・69 は develop のみ）。

---

## loop 68 — ROADMAP に「PR部分のブラッシュアップ」を2件起票（2026-08-19）

### 経緯
- loop 67 で実行可能な残タスクがゼロになった状態で、ユーザーから
  「ロードマップにPR部分のブラッシュアップを入れて」との指示。
  「PR」がサイトの宣伝部分と Pull Request 運用の両方に読めたため確認し、
  **両方を別タスクとして起票**することで合意した。

### やったこと（ドキュメントのみ・コード変更なし）
- ROADMAP「UX 改善」に **トップページの PR（宣伝）部分のブラッシュアップ** を追加。
  対象は `app/(site)/page.tsx` のヒーロー・「雅が選ばれる理由」・「ご利用の流れ」・
  末尾CTA。観点として、利用シーンの明示／申込前の不安を解消する情報（価格帯・送料・
  レンタル日数）／CTAの文言と配置／文言を `data/` に分離して差し替え運用できる形／
  「お客様の声」との重複整理、を書き添えた。
- ROADMAP「品質・整備」に **Pull Request 運用のブラッシュアップ** を追加。
  `.github/pull_request_template.md` の新規追加（現状このリポジトリには無い）、
  本番反映をPR経由にするかの判断と SKILL.md「Git運用」節への反映、
  PR本文にデプロイ後の確認項目を定型で載せる、の3点。

### 気づき・次への申し送り
- 「PR」は文脈によって宣伝と Pull Request のどちらにも読める。ROADMAP では
  どちらか分かるよう「PR（宣伝）」「Pull Request 運用」と明示して書き分けた。
- 直前の loop 67 までを `master` にマージして本番反映済み（Cloud Run へのデプロイ成功、
  バージョン 0.4.6）。ただしこの環境からは `*.a.run.app` への接続がエグレスポリシーで
  403 拒否されるため、**本番画面の実地確認はできていない**（デプロイ成功は
  GitHub Actions のジョブ結果で確認）。

---

## loop 67 — 予約入力バリデーションを純粋関数へ切り出し（2026-08-19）

### 経緯
- ROADMAP の残タスク（環境的に不可な Capacitor 実機ビルドを除く最後の1件）。
  検証ロジックが `CheckoutView.tsx` のインライン関数にあり、テストできない状態だった。

### やったこと
- `lib/reservation-validation.ts`（新規）: DOM にも Prisma にも依存しない純粋関数群。
  - `validateReservationForm(values)` … フィールド別のエラーメッセージを返す
  - `isValidEmail` / `isReceiveMethod` / `hasErrors` / `firstErrorMessage`
  - `firstErrorMessage` は入力欄の並び順（name → email → tel → address）で1件返す。
    フィールド単位で表示できないサーバー側向け。
- `components/CheckoutView.tsx`: ローカルの `validate` と `Errors` 型を削除し、
  共通関数・共通型（`ReservationErrors` / `ReceiveMethod`）を使うよう置換。
- `lib/actions/reservation.ts`: 独自に書かれていた必須チェックを同じ関数に置き換え。
  **サーバー側でもメール形式を検証するようになった**（従来は presence のみで、
  文言も「必須項目が入力されていません。」と大雑把だった）。サーバーアクションは
  クライアントを通さず直接呼べるので、ここが実質的な最終防衛線になる。
- `tests/reservation-validation.test.ts`（新規, 16件）: 正常系・各項目の必須・
  メール形式・店頭受取なら住所不要・住所 undefined・複数同時エラー・`firstErrorMessage` の順序。
- `scripts/e2e/checkout-validation.mjs`（新規）: 未入力送信で4件のエラーが同時に出て
  送信されない／メール形式エラーへの切り替わり／店頭受取で住所欄が消える／
  正しい入力で申込完了（DBに `method: "store"` で保存）を確認。

### 気づき
- クライアントとサーバーで検証が二重に書かれていると、文言だけでなく**厳しさ**もずれる
  （今回はサーバー側にメール形式チェックが無かった）。共通化の主目的は重複排除より
  このズレの解消だった。
- `lib/` 配下でも `"server-only"` を import しなければクライアントコンポーネントから
  使える。純粋ロジックを置く場所として問題ない。

### 結果
- ESLint 0・vitest **84件パス**（68→84）・`next build` 成功。
- `npx tsx scripts/e2e/checkout-validation.mjs` **PASS**（4項目すべて確認）。

### 気づき・次への申し送り
- **ROADMAP の実行可能な残タスクはこれでゼロ**。残るのは
  「Capacitor の ios/android 実機ビルド」のみで、macOS+Xcode / Android Studio が
  必要なためこの環境では実施できない（手順は `web/docs/CAPACITOR-runbook.md`）。
- 次に進めるなら、新しいフェーズの目的をユーザーと合意してから ROADMAP に起票すること
  （禁止事項「目的・ゴールから外れた作業を勝手に追加しない」）。

---

## loop 66 — 商品一覧のページネーション（8件/頁）（2026-08-19）

### 経緯
- ROADMAP上から順で残っていた「商品一覧のページネーション」に着手。
  商品が増えたときに1画面へ全件並べない形にする。検索・並び替え（loop 37）と
  同じ `kimono-filter.ts` に純粋ロジックとして足し、URLクエリで状態を持つ。

### やったこと
- `lib/kimono-filter.ts`: `PAGE_SIZE = 8` と純粋関数を追加。
  - `countPages(total, pageSize)` … 端数切り上げ。0件でも1ページ扱い（空一覧を表示するため）
  - `parsePage(v, pages)` … クエリ文字列を正規化。数値でない/1未満/超過は範囲内に丸める（404にしない）
  - `paginate(items, page, pageSize)` … `{ items, page, totalPages, total }` を返す
  - `pageWindow(page, totalPages, max=5)` … 現在ページ中心のページ番号列（端では反対側へ寄せる）
- `components/Pagination.tsx`（新規）: 前へ/番号/次へ。`category`・`q`・`sort` を
  引き継ぎ、1ページ目には `page` を付けない（同内容のURLを2種類作らないため）。
  1ページしか無いときは描画しない。
- `app/(site)/kimonos/page.tsx`: `page` クエリを受け取り、絞り込み結果に `paginate` を適用。
  件数表示を「10件／1 / 2 ページ」の形に拡張。
- `tests/kimono-filter.test.ts`: 上記4関数のテストを追加（56→68件）。
- `scripts/e2e/kimonos-pagination.mjs`（新規）: 1頁8件・次へ/前へ・2頁目が重複しない・
  並び替え条件の維持・絞り込み時はページ送りを出さない、をPlaywrightで確認。

### 気づき
- 条件を変えたときのページリセットは、`KimonoFilters` が毎回 `URLSearchParams` を
  作り直しているため自動的に効く（`page` が引き継がれない）。追加実装は不要だった。
- e2eはDBを読むだけでデータを作らないので、後片付けは `$disconnect` のみ。

### 結果
- ESLint 0・vitest 68件パス・`next build` 成功。
- `npx tsx scripts/e2e/kimonos-pagination.mjs` **PASS**（5項目すべて確認）。
  スクリーンショットでもレイアウト崩れが無いことを確認。

### 気づき・次への申し送り
- 現在は全件をDBから取ってから in-memory で切り出している（商品10件のため）。
  件数が数百を超えるようなら、`take`/`skip` でDB側に寄せるタスクを起票すること。
- 残タスク: 「予約入力バリデーションの純粋関数化＋テスト」
  「Capacitor の実機ビルド（要 macOS/Android Studio・この環境では不可）」。

---

## loop 65 — 入金ステータス判定を純粋関数へ切り出し（2026-08-19）

### 経緯
- loop 62（develop側の実装）は正しく動いていたが、支払い導線の条件が
  `paymentStatus === "unpaid"` / `=== "refunded"` と各所に直書きされており、
  ステータスが増えたときに支払いボタンが勝手に復活しうる形だった。
  破棄した重複ブランチから、この部分の整理とテストだけを取り込んだ。

### やったこと
- `lib/payment.ts`: 選択肢の唯一の定義 `paymentStatuses` と、支払い導線を出して
  よいかを表す `isPayable`（未払いのときだけ true）を追加。`isPaymentStatus` は
  `paymentStatuses` から導出する形に変更（値の追加漏れが起きないように）。
- `components/PaymentControl.tsx`: ローカルの `options` 配列を `paymentStatuses` に統一。
- `app/(site)/mypage/page.tsx`・`lib/actions/payment.ts`: 分岐を `isPayable` に置換。
- `tests/payment.test.ts`: `paymentStatuses` と labels のキー一致、`isPayable` の
  テストを追加（53→56件）。

### 結果
- ESLint 0・vitest 56件パス・`next build` 成功。
- e2e `admin-payment-status.mjs` / `payment-flow.mjs` ともに **PASS**（挙動は不変）。

### 気づき・次への申し送り
- 「paid ではない」ではなく「unpaid である」で判定するのが要点。ステータスを
  追加するときは `paymentStatuses` に足すだけで選択肢・型ガードの両方に効く。
- 残タスク: 「商品一覧のページネーション」「予約入力バリデーションの純粋関数化＋テスト」
  「Capacitor の実機ビルド（要 macOS/Android Studio）」。

---

## loop 64 — e2e 実行基盤の安定化（launchChromium・待機競合・古い手順）（2026-08-19）

### 経緯
- `/loop 20min` を別ブランチ（`claude/20min-loop-9zr372`）で回していたところ、
  同じ loop 62（入金ステータスの手動更新）を develop 側でも実装済みだと判明。
  **重複コミットは破棄**し、develop に無かった知見だけを本ループとして取り込んだ
  （以降のループは develop で回す方針をユーザーと合意）。

### やったこと
- `scripts/e2e/browser.mjs`（新規）: `launchChromium()` を追加。
  `$PLAYWRIGHT_BROWSERS_PATH/chromium` が存在すれば `executablePath` として渡す
  （`E2E_CHROMIUM_PATH` で明示指定も可）。既存 e2e 6本をすべてこれ経由に移行。
- `scripts/e2e/admin-payment-status.mjs`: 更新完了の待ち方を修正。
- `scripts/e2e/checkout-autofill.mjs` / `payment-flow.mjs`: signup 手順を現行仕様へ修正
  （`#password-confirm` の入力を追加、`button[type=submit]` → `button:has-text('登録する')`）。
- SKILL.md の「Playwrightでの動作確認」に上記3点の知見を追記。

### つまずいた点
- **`chromium.launch()` がこの環境で動かない**。`@playwright/test` の版と環境同梱
  Chromium のリビジョンがずれており、`chromium_headless_shell-1234` を探して落ちる。
  実体は `/opt/pw-browsers/chromium`（symlink）にあるので、これを明示的に渡す形にした。
- **「返金済み」ボタンを押してから `waitForSelector("text=返金済み")` で待つのは無意味**。
  押したボタン自身がその文言を含むため即成立し、直後のDB読み取りが更新前の値になる
  （`paid` を期待して `unpaid` を読む形で1手ずれる）。`disabled` 待ちも同様に不可
  （更新中は全ボタンが disabled になるため）。見出し横のバッジで待つ形に変更。
- **loop 60 の仕様変更で e2e 2本が壊れたまま放置されていた**。会員登録に確認用
  パスワードが増えたのに signup 手順が古く、`/mypage` への遷移待ちでタイムアウトしていた。

### 結果
- ESLint 0・vitest 53件パス。
- e2e **6本すべて PASS**（admin-payment-status / admin-review-moderation /
  checkout-autofill / password-reset / payment-flow / signup-password-confirm）。

### 気づき・次への申し送り
- 同じ課題を複数セッションで並行実装すると丸ごと重複する。ループを回す前に
  `git fetch` して develop の最新を確認すること（今回の再発防止）。
- 破棄した重複ブランチ `claude/20min-loop-9zr372` は origin に残してある。不要なら削除可。
- 残タスク: 「商品一覧のページネーション」「予約入力バリデーションの純粋関数化＋テスト」
  「Capacitor の実機ビルド（要 macOS/Android Studio）」。

---

## loop 63 — /legal（特定商取引法に基づく表記）ページを追加（自律ループ）（2026-08-19）

### 経緯
- `/loop`自律ティックの継続。ROADMAP上から次の未着手タスク
  「特定商取引法に基づく表記ページ（/legal）」に着手。

### やったこと
- `data/legal.ts`: 表示項目（販売業者・運営統括責任者・所在地・電話番号・
  メールアドレス・販売価格・商品代金以外の必要料金・お支払い方法/時期・
  引渡し時期・返品交換・キャンセルについて）をダミー値で定義。実運用時は
  この値を差し替えるだけで対応できるよう、表示コンポーネントとデータを分離。
- `app/(site)/legal/page.tsx`: `dl`で一覧表示するページを新規作成。
- `components/Footer.tsx`: サイト共通フッターに「特定商取引法に基づく表記」への
  導線を追加。

### 結果
- ESLint 0・vitest 53件パス・`next build`成功（`/legal`ルート追加）。
- Playwrightで実地確認：フッターのリンクから`/legal`へ実際に遷移できること、
  12件の項目が表示されること、「販売業者」「キャンセルについて」等の主要項目が
  含まれることを確認。

### 気づき・次への申し送り
- `master`へはまだマージ・pushしていない（自律ループの方針を継続）。
- 次はROADMAP上から「商品一覧のページネーション」「予約入力バリデーションの
  純粋関数化」のいずれか。

---

## loop 62 — 管理画面から入金ステータスを手動更新（自律ループ）（2026-08-19）

### 経緯
- `/loop`（自律・自己ペース）で起動。会話の直近の確立された作業パターン
  （ROADMAP駆動のループ継続）を継続する形で、ROADMAP上から次の未着手タスク
  「入金ステータスの手動更新」に着手（Capacitor実機ビルドは環境制約のためスキップ）。

### やったこと
- `lib/payment.ts`: `PaymentStatus`に`"refunded"`（返金済み）を追加
  （旧: unpaid/paid の2値 → unpaid/paid/refunded の3値）。
- 3値化に伴い、影響箇所を洗い出して修正（放置すると二重決済等の実バグになるため）：
  - `app/(site)/mypage/page.tsx`・`components/OrderLookup.tsx`：決済ボタンの
    表示条件を `paymentStatus !== "paid"` → `paymentStatus === "unpaid"` に変更
    （返金済みでも決済ボタンが再度出てしまうのを防止）。
  - `lib/actions/payment.ts`：`payReservation`/`payMyReservation`に
    「返金済みなら決済不可」のガードを追加（返金済み予約への再課金を防止）。
  - `tests/payment.test.ts`：`isPaymentStatus("refunded")`が`false`である
    前提の既存テストを、新仕様（`true`）に合わせて修正。
- `lib/actions/admin-payment.ts`：`updatePaymentStatus`（`StatusControl`と
  同型、`/admin`配下でBasic認証保護）。
- `components/PaymentControl.tsx`：未入金/支払い済み/返金済みを切り替える
  管理画面用ボタン群（`StatusControl.tsx`を踏襲）。
- 管理画面の予約詳細ページに「入金ステータス変更」セクションを追加。
- `scripts/e2e/admin-payment-status.mjs`：会員登録→予約→未払いバッジ確認→
  管理画面で「返金済み」に変更→マイページのバッジ変化と決済ボタン消失を
  Playwrightで確認するスクリプトを追加。

### 結果
- ESLint 0・vitest 53件パス（不整合テスト1件を修正済み）・`next build`成功。
- `ADMIN_PASSWORD=e2e-test-pass npx tsx scripts/e2e/admin-payment-status.mjs`
  実行で **PASS**。
- 「管理画面」ROADMAPグループが全て完了。

### 気づき・次への申し送り
- `master`へはまだマージ・pushしていない（自律ループでは、ユーザーの明示的な
  指示が無い限りmasterへpushしない方針を維持）。
- 次はROADMAP上から「/legal（特定商取引法に基づく表記）」
  「商品一覧のページネーション」「予約入力バリデーションの純粋関数化」のいずれか。

---

## loop 61 — パスワードリマインダー（再設定機能）を追加（2026-08-19）

### 経緯
- 「ループをつづけて」の指示で継続。ROADMAP最上位の残タスク
  「パスワードリマインダー」に着手（これで「ユーザー認証・マイページ」
  グループが全て完了）。

### やったこと
- `prisma/schema.prisma`: `PasswordResetToken`（token/userId/expiresAt）を追加。
  `DATABASE_URL="file:./dev.db"` を一時的に指定して`prisma migrate dev`で
  マイグレーションファイルを生成し（.envのTurso設定は変更せず）、
  `turso db shell miyabi` で本番DBにも直接適用。`npx prisma generate`で
  クライアントを再生成（生成し忘れて一度buildの型チェックで失敗した）。
- `lib/auth.ts`: `createPasswordResetToken`（1時間有効・発行時に同ユーザーの
  既存トークンを全削除）、`consumePasswordResetToken`（検証と同時に使い捨てで削除）。
- `lib/mail-templates.ts`: `passwordResetEmail`（既存のモック送信の仕組みに乗せる）。
- `lib/actions/auth.ts`: `requestPasswordReset`（メール存在有無を問わず常にok:true、
  存在する場合のみ実際に送信して推測されないように）、`resetPassword`
  （トークン検証→パスワード更新→自動ログイン）。
- `components/ForgotPasswordForm.tsx`・`ResetPasswordForm.tsx`と
  `/forgot-password`・`/reset-password`ページを新規作成。`LoginForm`に
  「パスワードをお忘れの方はこちら」リンクを追加。
- `scripts/e2e/password-reset.mjs`: 未登録メールでの汎用メッセージ・
  トークン発行・再設定・旧パスワード失効・新パスワードでのログイン・
  トークン再利用不可、の5点をPlaywrightで確認するスクリプトを追加。

### つまずいた点
- `page.click("button[type=submit]")` が、ログイン中はヘッダーの
  「ログアウト」ボタン（同じく`type=submit`）を誤ってクリックしてしまい、
  意図せずログアウト＆ホームに遷移する不具合に遭遇。原因特定にやや時間が
  かかった。**恒久対策**：SKILL.mdに追記し、全てのボタンクリックを
  `button:has-text(...)`のテキスト指定に統一。
- 最初のテスト実行で `ok` 判定ロジックのバグ（最後の操作後の`page.url()`を
  再利用していたため、途中の「新パスワードでログイン成功」の判定が
  正しく反映されない）に気づき、該当ステップの直後に真偽値を変数へ
  キャプチャする形に修正。

### 結果
- ESLint 0・vitest 53件パス・`next build`成功（`/forgot-password`・
  `/reset-password`ルート追加）。
- `npx tsx scripts/e2e/password-reset.mjs` 実行で **PASS**（5項目すべて確認）。

### 気づき・次への申し送り
- 「ユーザー認証・マイページ」グループが全て完了。次はROADMAP上から
  「入金ステータスの手動更新」「/legal」「商品一覧のページネーション」
  「予約入力バリデーションの純粋関数化」のいずれか。

---

## loop 60 — 会員登録のパスワード確認2回入力（2026-08-19）

### 経緯
- 「ループをつづけて」の指示。ROADMAPの最上位（上から順）の未着手タスクである
  「会員登録時にパスワードを2回入力させる」に着手。

### やったこと
- `components/SignupForm.tsx`: 「パスワード（確認）」フィールドを追加。
  送信前にクライアント側で一致チェックし、不一致なら送信せずエラー表示。
- `lib/actions/auth.ts`: `register()` に `passwordConfirm` を追加し、
  サーバー側でも不一致を検証（クライアント側チェックのみに依存しない防御）。
- `scripts/e2e/signup-password-confirm.mjs`: 不一致→エラー表示・未登録、
  一致→登録成功・マイページ遷移、の両方をPlaywrightで確認するスクリプトを追加。

### 結果
- ESLint 0・vitest 53件パス・`next build`成功。
- `npx tsx scripts/e2e/signup-password-confirm.mjs` 実行で **PASS**。

### 気づき・次への申し送り
- 次はROADMAP最上位の残タスク「パスワードリマインダー（再設定機能）」。

---

## loop 59 — masterへのpushルールを緩和（2026-08-19）

### 経緯
- ユーザーから「マージしてpushして」の指示。loop 54で決めた「masterへの
  pushは必ず人間が行う」ルールと矛盾するため確認したところ、
  「人間が指示したときは実行してよいとスキルに追加して」との回答。

### やったこと
- SKILL.mdの「Git運用」節・「禁止事項」を修正：masterへのpushは
  **原則人間が行うが、ユーザーが明示的に指示した場合はClaudeが実行してよい**。
  「マージして」のみでpushへの言及が無い場合はマージまでに留め、
  push自体はユーザーに委ねる、という運用を明記。

### 結果
- コード変更は無し（運用ルールの更新のみ）。

---

## loop 58 — 古いMonaca/Cordova残骸を削除（2026-08-19）

### 経緯
- ユーザーから「古いMonaca残骸（config.xml・platforms/・www/・.monaca/等）は
  整理したい」との依頼（loop 57と同じメッセージでまとめて依頼された別件）。

### やったこと
- リポジトリ直下の `config.xml`・`platforms/`・`www/`・`res/`・`.monaca/` を削除
  （合計179ファイル。現行の Next.js プロジェクト（`web/`）とは無関係な、
  Monaca/Cordovaの初期テンプレートの残骸だった）。
- 事前に他ファイルからの参照が無いか確認：`web/docs/CAPACITOR.md` 等が
  `www/` に触れている箇所は `web/native/www/`（Capacitor用に loop43 で新設した
  別物）であり、削除対象の root `www/` とは無関係と確認した。
- root の `LICENSE`・`.gitignore` はそのまま残した（現行プロジェクトと無関係とは
  言えないため）。

### 結果
- ESLint 0・vitest 53件パス（`web/`配下は無影響のため想定通り）。

### 気づき・次への申し送り
- リポジトリ直下がすっきりし、`.claude/`・`.github/`・`web/`・`LICENSE`・
  `.gitattributes`・`.gitignore` のみになった。

---

## loop 57 — 管理画面フッターにバージョン表示を追加（2026-08-19）

### 経緯
- ユーザーから「CDを試しに発火して」の一連の作業（gh CLI導入・master push・
  実デプロイ成功）の後、「adminのBasic認証にログインできない」との報告 →
  ローカルの`.env`と本番Secret Managerのパスワードが別物という混同と判明・解決。
- その流れで「何を変更したのかわからないので、admin画面のフッターに
  バージョン情報を載せてほしい」との要望（スキルへの追加として）。
  バージョン形式: `X.Y.Z`＝Xは人間が変更／Yはmasterへのpush回数／Zはその
  pushに含まれるコミット数（push毎に0から数え直す）。

### やったこと
- `web/lib/version.ts`: `APP_VERSION`環境変数を読む（未設定時は
  `package.json`のメジャー値から`X.0.0-dev`を表示）。
- `web/app/admin/layout.tsx`: フッターに`雅 管理画面 v{バージョン}`を表示。
- `web/package.json`: version を `0.1.0` → `0.0.0` に変更
  （X=0のみ人間が管理する値とし、Y/Zはコード側に保持しない）。
- `.github/workflows/deploy.yml`: デプロイのたびに
  X（package.jsonのメジャー値）・Y（`github.run_number`）・
  Z（`git rev-list --count <push前SHA>..<push後SHA>`、push以外は0）を算出し、
  `gcloud run deploy --update-env-vars APP_VERSION=X.Y.Z` で反映
  （`--update-env-vars`は差分適用のため、既存のDATABASE_URL等は維持される）。
  `actions/checkout`に`fetch-depth: 0`を追加（コミット数算出に全履歴が必要）。
- SKILL.mdに「バージョン表示」節を新設。あわせて「Git運用」節の
  「デプロイは手動のまま」という記述が loop56 で古くなっていたため、
  CI/CDが実際に動く現状に合わせて修正。

### 結果
- ESLint 0・vitest 53件パス・`next build`成功。
- ローカルの`.env`のADMIN_PASSWORDが不明（以前と変わっていた）だったため、
  値を読まずに`ADMIN_PASSWORD=verify1234 npm run dev`で一時上書きして
  Playwrightで確認：フッターに`雅 管理画面 v0.0.0-dev`と正しく表示。
- 本番への反映はこのコミットが`master`へpushされた後、CD一巡目のデプロイで
  初めて`APP_VERSION`（例: `0.<run_number>.<コミット数>`）が設定される
  （このループの時点では未反映）。

### 気づき・次への申し送り
- ローカル開発時は常に`X.0.0-dev`表示になる仕様（Y/Zは本番デプロイでのみ意味を持つ）。
- 今後`master`にpushするたびにYが1つずつ増える。Zはその回のpushに含まれる
  コミット数なので、developで細かくコミットするほど大きくなる（累積ではない）。

---

## loop 56 — CI/CD構築（GitHub Actions + Workload Identity Federation）（2026-08-19）

### 経緯
- ユーザーから「CD/CI設定して」の指示（loop 54でGit運用ルール＝
  developで開発・masterへのpushで本番反映・pushは人間、を決めた続き）。

### やったこと
- GCP側（`webprog36`）:
  - デプロイ用サービスアカウント `github-deployer` を作成し、
    `roles/run.admin`・`roles/artifactregistry.writer`・
    `roles/iam.serviceAccountUser` を付与。
  - Workload Identity Pool（`github-pool`）／Provider（`github-provider`、
    `shuji30/shopping-site` リポジトリに限定した`attribute-condition`付き）を作成。
  - このリポジトリからのみ上記サービスアカウントへなりすませるよう
    `roles/iam.workloadIdentityUser` をバインド。
  - **サービスアカウントキー（JSON）は発行していない**＝GitHub側にシークレット
    登録は不要（`google-github-actions/auth`がOIDCトークンで直接認証）。
- `.github/workflows/ci.yml`: `develop`/`master`へのpush・PRで
  `npm ci`→`lint`→`test`→`build`（`web/`配下、`DATABASE_URL=file:./dev.db`の
  ダミー値。実DB接続はしない）。
- `.github/workflows/deploy.yml`: `master`へのpush（と手動`workflow_dispatch`）を
  トリガーに、Dockerビルド→Artifact Registry push（タグは`github.sha`）→
  `gcloud run deploy`。既存の環境変数/シークレット（DATABASE_URL・
  TURSO_AUTH_TOKEN・ADMIN_PASSWORD等）は明示指定しないことで前リビジョンから
  引き継がれるようにした。
- `web/docs/CI-CD.md`: 上記構成の説明とGCP側セットアップコマンドの記録を追加。

### 結果
- CIワークフローが実行する内容（`npm ci`〜`build`、`.env`無し・ダミー
  `DATABASE_URL`のみ）を、実際にこのマシン上で`node_modules`/`.next`を
  作り直して再現し、**lint・test・buildすべて成功**を確認。
- GitHub Actions自体（実際のワークフロー実行）は、`develop`へのpush後に
  GitHub側で確認が必要（このセッションでは実行結果まで見ていない）。

### 気づき・次への申し送り
- **`master`へのpushはこれまで通り人間が行う**が、これからはそのpushが
  そのまま本番デプロイのトリガーになる点に注意（誤ってmasterにpushすると
  即座にCloud Runへ反映される）。
- Playwright e2e（`scripts/e2e/`）はCIに含めていない（Turso/Admin認証の
  秘密情報をGitHubに置く必要が生じるため）。将来含めるなら、Tursoの
  検証用DB＋GitHub Secretsの追加が必要になる。
- 次回`develop`にpushした際、GitHub ActionsのCIが実際に緑になるか
  確認すること。

---

## loop 55 — 不要ブランチの整理＋破棄済みブランチからの機能発掘（2026-08-19）

### 経緯
- ユーザーから「`claude/loop-instruction-skill-3adxwh`ブランチは必要ないか？」との質問。
  調査したところ完全にmasterへマージ済み（独自コミットゼロ）と判明。
- ついでに`claude/loop-instruction-skill-continue-ruwp7i`という別の古いブランチも
  発見。こちらは`master`に無い独自コミットが7件あった。
- ユーザーから「continue-ruwp7iの内容もmasterに実装済みか？」との追加質問があり、
  コミット単位ではなく**中身**を1件ずつ突き合わせて確認した結果、
  4機能がmasterに未実装と判明（同じloop番号でも別の内容に置き換わっていたため、
  単純な「マージ済みか」のチェックだけでは見抜けなかった）。

### やったこと
- `claude/loop-instruction-skill-3adxwh` を削除（ローカル・GitHub両方）。
- `claude/loop-instruction-skill-continue-ruwp7i` にしか無い4機能をROADMAP.mdへ転記：
  - 特定商取引法に基づく表記ページ（/legal）— 通知・その他機能
  - 商品一覧のページネーション — UX改善
  - 管理画面からの入金ステータス手動更新 — 管理画面
  - 予約入力バリデーションの純粋関数化＋テスト — 品質・整備
  （いずれも「現行実装向けに作り直す」前提で記載。古いブランチのコードは
  Prisma7以前・DB導入前などの旧い実装のため、そのまま流用はできない）

### 結果
- コード変更は無し（ブランチ整理とROADMAP追記のみ）。

### 気づき・次への申し送り
- `claude/loop-instruction-skill-continue-ruwp7i` は4機能をROADMAPへ転記後、
  ユーザーの意向により削除する（このループの後続作業）。
- 「同じloop番号でも中身が別物」という事故が起きていたことが分かったため、
  今後、破棄されたブランチの要否を判断する際は**コミットの有無だけでなく
  実際の差分（`git show`/`git diff`）まで確認する**ことをこのHISTORY自体に
  教訓として残しておく。

---

## loop 54 — Git運用ルールをスキルに追加＋ロードマップにタスク追加（2026-08-19）

### 経緯
- ユーザーから2件の指示：
  1. スキルに追加：「masterへのgit pushで本番更新する。pushは人間が行う」
     「開発はdevelopブランチで行う」
  2. ロードマップに追加：「会員登録時にパスワードを2回入力させる」
     「パスワードリマインダーを追加」

### やったこと
- `develop` ブランチを `master`（loop 53まで反映済み）から作成し、`origin` へpush。
  **これ以降のループのコミットは `develop` に対して行う**。
- `.claude/skills/loop-instruction/SKILL.md`:
  - 「Git運用（ブランチ・本番反映）」節を新設。開発は`develop`で行うこと、
    `master`は本番相当でありその反映（`git push origin master`）は必ず人間が行うこと、
    Claude自身は`master`へpushしないことを明記。
  - 「禁止事項」にも「`master`へ`git push`しない」を追加。
- ROADMAP.md：「ユーザー認証・マイページ」→「アカウント制のログイン」の下に
  2件の未着手タスクを追加（親項目のチェックは`[~]`に戻した）：
  - 会員登録時のパスワード確認用2回入力
  - パスワードリマインダー（再設定機能）

### 結果
- コード変更は無し（運用ルール・ロードマップの更新のみ）。ビルド等の検証は不要と判断。

### 気づき・次への申し送り
- 次回以降のループ開始時は `git branch --show-current` で **`develop`** に
  いることを確認すること（`master`ではない点に注意。loop 47で経験した
  「意図せず違うブランチにいた」問題の再発防止も兼ねる）。
- ROADMAPの2件（パスワード確認2回入力／パスワードリマインダー）が次の
  実装候補。パスワードリマインダーはメール送信が絡むため、既存の
  `lib/mail.ts`（モック送信）の仕組みを踏襲する想定。
- `master`への反映（`develop`の内容をマージしてpush）は、ユーザーから
  明示的に指示があるまで行わない。

---

## loop 53 — GCP実デプロイ完了（Cloud Run + Turso）（2026-08-19）

### やったこと
- `webprog36` プロジェクトの課金を有効化（唯一のOPENな請求先アカウントをユーザー確認の上で紐付け）。
- 必要API有効化（Cloud Run / Artifact Registry / Cloud Build / Secret Manager）。
- Artifact Registryリポジトリ `miyabi`（asia-northeast1）を作成。
- `gcloud builds submit` でコンテナをビルド＆push（1回目は`PERMISSION_DENIED`で失敗。
  課金/API有効化直後のIAM↔GCSレガシーACL反映待ちと見られ、リトライで成功）。
- 管理画面パスワードをランダム生成（`openssl rand`）してSecret Manager
  （`miyabi-admin-pass`）に登録。Tursoトークンも同様に`miyabi-turso-token`へ登録。
- `gcloud run deploy` でCloud Runにデプロイ。1回目はCloud Runのデフォルトサービス
  アカウントにSecret Manager閲覧権限が無く失敗 →
  `secrets add-iam-policy-binding`で`roles/secretmanager.secretAccessor`を
  付与して解決。
- 本番URL（`https://miyabi-294448459831.asia-northeast1.run.app`）が発行され、稼働確認。

### 検証
- curlでのステータスコード確認（`/`・`/kimonos`・Basic認証あり/なしの`/admin`）。
- **Playwrightで実ブラウザとして本番URLを確認**（curl依存を避ける教訓を即実践）：
  `/kimonos`で10件の商品が正しく表示されることを確認。
- `scripts/e2e/`の3本すべてを `E2E_BASE_URL=<本番URL>` で実行し、**すべてPASS**：
  会員登録・チェックアウト自動入力・オンライン決済・管理画面のレビュー削除。
- この過程で新たな実バグを発見・修正：`admin-review-moderation.mjs`が使っていた
  `browser.newContext({ httpCredentials })` が、**本番のHTTPS環境に対しては
  応答が返らずタイムアウトする**（ローカルのHTTPでは問題なし）。
  `page.setExtraHTTPHeaders({ Authorization: "Basic ..." })` 方式に変更して解決。
  ローカル・本番の両方で再確認しPASS。
- ESLint 0・vitest 53件パス。

### 結果
- **本番公開完了**。サンプルサイトとして実際にインターネットからアクセス可能。
- 本番URL・管理画面パスワードはユーザーに別途チャットで共有済み（HISTORYには残さない）。

### 気づき・次への申し送り
- Cloud Runはデフォルトでゼロスケールのため、アクセスが無ければ課金はほぼ発生しない
  （Tursoも無料枠）。運用コストの心配は基本的に不要。
- アプリの更新は「`gcloud builds submit`（手順4）→`gcloud run deploy`（手順5）」を
  再実行するだけ（docs/DEPLOY-GCP.md 手順6）。スキーマ変更時は
  `turso db shell miyabi < 新しいmigration.sql` を追加で実行する。
- ROADMAPの残タスクはCapacitorの実機ビルドのみ（要 macOS+Xcode / Android Studio、
  この環境では引き続き不可）。GCPデプロイは今回で解消したので、
  「環境の制約」として残る既知の未完了タスクはこれで最後の1件になった。

---

## loop 52 — GCP実デプロイ着手：TursoでDBを無料化＋大きな学び（2026-08-19）

### 経緯
- ユーザーから「gcpへデプロイ」の指示。調査の結果、**この環境でも `gcloud` が
  `shuji30@gmail.com` で認証済みで実際にデプロイ可能**と判明（過去のloop 43/45の
  「環境では不可」という記述は、当時の実行環境の制約であり、常に不可能なわけではなかった）。
- デプロイ先GCPプロジェクトとDB構成をユーザーに確認。
  - プロジェクト: 既存の `webprog36` を使用。
  - DB: 当初案のCloud SQLはサンプルサイトに対し月額固定費が発生するため、
    ユーザーの意向で **Turso（libSQL無料枠）** に変更。既存コードがSQLite/libSQL
    アダプタ前提のため、コード変更ゼロで移行できる想定。

### やったこと
- Turso CLI導入：Windowsにはネイティブビルドが無いため、WSL(Ubuntu-20.04)に
  インストール。ヘッドレスログイン中継はWSLg経由のChromiumが壊れて失敗したため、
  ユーザー自身のターミナルで `turso auth login`〜`db create`〜`db tokens create`を
  実行してもらう方式に変更。
- `lib/db.ts`: `TURSO_AUTH_TOKEN` 環境変数を読み、`PrismaLibSql`に渡すよう対応。
  `.env.example`にTurso設定のひな形を追記。
- 既存の `prisma/migrations/*/migration.sql`（SQLite方言）を `turso db shell` で
  直接流し込み適用（**Prisma CLIは`libsql://`スキームを直接扱えない**ため
  `prisma migrate deploy`は使えない。CLI外で直接SQLを適用する方式を確立）。
- `npm run db:seed` でサンプル商品を投入。

### つまずいた点（大きな学び・すべて解決済み）
1. **`.env`が読み込まれない**：`next dev/build`はNext.jsが自動で`.env`を読むが、
   `tsx prisma/seed.ts`のような単体スクリプト実行では読み込まれず、
   `DATABASE_URL`未設定＝`file:./dev.db`へ静かにフォールバックしていた。
   これにより「seedは成功したのにTursoには反映されない」という紛らわしい
   症状になった（一時は「Tursoは書き込み直後の切断でデータをロストする」という
   誤った仮説を立てて`disconnectSafely`ヘルパーを実装したが、原因はこちらではないと
   判明し撤回・削除した）。**恒久対策**：`lib/db.ts`の先頭に`import "dotenv/config"`を
   追加し、どの起動経路でも確実に読み込まれるようにした。
2. **`curl`でのUI確認が信用できない**：`.env`修正後も`/kimonos`が`curl`で
   「0件」に見えたが、Playwrightで実ブラウザ確認すると実際は「10件」正しく
   表示されていた。Next.jsのストリーミングSSRの都合で`curl`は初期シェルの
   断片しか見られないことがあると判明。**恒久対策**：SKILL.mdに明記し、
   疑わしい時はcurlでなくPlaywrightで確認するルールを追加。
- 併せて `prisma/seed.ts` と3本の `scripts/e2e/*.mjs` を、それぞれが個別に
  `PrismaClient`/`PrismaLibSql`を組み立てていたのをやめ、`lib/db.ts`の
  `prisma`シングルトンを共通importする形にリファクタ（アダプタ選択ロジックの
  重複を解消。副作用として、e2eスクリプトの`cleanup()`が`file:./dev.db`に
  ハードコードされていて**Turso環境では自己クリーンアップが機能しない**という
  実バグも同時に修正した）。

### 結果
- Turso上のマイグレーション適用・シード（10件）を確認。
- Playwright e2e 3本（checkout-autofill / payment-flow / admin-review-moderation）を
  Turso接続で実行し、**すべてPASS**。cleanup()も正しくTurso上のテストデータを削除。
- ESLint 0・vitest 53件パス・`next build`成功。
- docs/DEPLOY-GCP.md を全面改訂：TursoとCloud SQLを選択できる構成にし、
  Turso向けの手順（`turso db shell`でのマイグレーション適用、Cloud Run
  デプロイ時のSecret Manager設定）を追加。.claude/skills/loop-instruction/SKILL.md の
  「つまずきやすい点」も今回の学びで更新。

### 気づき・次への申し送り
- **次はコンテナビルド〜Cloud Runデプロイ本体**（Artifact Registry push →
  `gcloud run deploy`、対象プロジェクト`webprog36`）。DB側の準備は完了。
- 今回の教訓（`.env`未読み込み／`curl`不信）は今後のあらゆるTurso関連・
  RSCストリーミングページの検証に効いてくるはずなので、次ループ以降も
  SKILL.mdのこの節を必ず参照すること。

---

## loop 51 — Playwright e2e: 管理画面のレビュー削除を実地確認（2026-08-18）

### 経緯
- cron による定期実行。ROADMAP残タスクは環境制約2件のみ。loop 50 の申し送りで
  「管理画面のレビュー削除（loop 47）はまだ実クリックで未検証」としていた点に着手。

### やったこと
- `web/scripts/e2e/admin-review-moderation.mjs` を追加：商品詳細でレビューを投稿→
  詳細ページに表示されることを確認→管理画面（Basic認証付きコンテキストで
  `/admin/reviews` へアクセス）にも表示されることを確認→「削除」ボタンをクリック
  （`window.confirm` は `dialog` イベントで自動acceptしてクリック）→管理画面・詳細
  ページの両方から消えることを確認。投稿したレビューは `finally` で自己削除
  （既にUIから削除済みなら何もしない）。

### 結果
- ESLint 0・テスト 53 件パス・`next build` 成功。
- `npx tsx scripts/e2e/admin-review-moderation.mjs` 実行で **PASS**
  （投稿直後は詳細・管理画面の両方に表示、削除後は両方から消えることを実ブラウザ操作で確認）。
  新たな不整合は見つからなかった。

### 気づき・次への申し送り
- `scripts/e2e/` に3本のスクリプトが揃った（チェックアウト自動入力／決済／レビュー
  モデレーション）。ROADMAPの残タスクは環境制約2件のみで、既存クリティカルフローの
  e2e化はひとまず主要どころを一巡した。
- **次に進めるべきかはユーザーに相談したい**：これ以上「まだe2e化していない画面」を
  探して機械的にスクリプトを増やし続けるのは、目的に照らして価値が薄まる段階に
  来ていると判断。新機能の要望が無ければ、20分間隔の自動ループは一旦停止を提案する。

---

## loop 50 — Playwright e2e: 決済フローの実地確認（2026-08-18）

### 経緯
- cron による定期実行（20分間隔）。ROADMAP残タスクは環境制約2件のみ。直前のユーザーとの
  やり取りで「決済画面はどこ？」という質問があり、口頭で仕組み（マイページ／予約照会からの
  ワンクリック決済）を説明したのみで実際のクリックまでは検証していなかったため、loop 49 で
  整備した Playwright 基盤を使って決済フローを e2e で実地確認するタスクを追加して着手。

### やったこと
- `web/scripts/e2e/payment-flow.mjs` を追加：会員登録→カート追加→予約申込→マイページで
  「未払い」バッジ＋「オンライン決済」ボタンを確認→ボタン押下→「支払い済み」バッジに
  変わりボタンが消えることを確認、という一連をアサート。テストユーザー・予約は
  `checkout-autofill.mjs` と同じ方針で `finally` で自己削除。

### 結果
- ESLint 0・テスト 53 件パス・`next build` 成功。
- `npx tsx scripts/e2e/payment-flow.mjs` 実行で **PASS**（決済前: 未払いバッジ1件・決済
  ボタン1件、決済後: 支払い済みバッジ1件・決済ボタン0件、を実ブラウザ操作で確認）。
  loop 49 のチェックアウト自動入力の時と異なり、今回は新たな不整合は見つからなかった。

### 気づき・次への申し送り
- `scripts/e2e/` に2本目のスクリプトが揃った。今後は管理画面のレビュー削除（loop 47、
  まだ実クリックでは未検証）など、他のクリティカルフローにも同じ方針で広げられる。
- ROADMAPの残タスクは引き続き環境制約2件（Capacitor実機ビルド／GCP実デプロイ）のみ。

---

## loop 49 — Playwrightでの動作確認をスキルに組み込み（2026-08-18）

### 経緯
- 前ループ（loop 48）で「ブラウザ自動操作ツールが無く、実際に入力欄へ値が反映される
  様子はcurlでは確認できない」と伝えたところ、ユーザーから「playwrightで確認するよう
  スキルに追加して」と依頼。

### やったこと
- `@playwright/test` を devDependencies に追加。Chromiumバイナリはこの環境に既存
  （`C:\Users\shuji\AppData\Local\ms-playwright`）だったため追加ダウンロード不要。
- `web/scripts/e2e/checkout-autofill.mjs` を作成：loop 48 の自動入力を実地検証する
  Playwrightスクリプト（会員登録→カート追加→チェックアウト1回目（会員情報のみ自動入力）
  →予約確定→カート追加→チェックアウト2回目（電話番号・住所も自動入力）をアサート）。
  作成したテストユーザー・予約は成功/失敗に関わらず `finally` で自己削除する。
- 実行してみたところ、**実装済みの案内文に不整合を発見**：予約履歴が無い会員にも
  「前回のご注文内容から自動入力しています」と表示されてしまっていた。
  `CheckoutView.tsx` に `hasOrderHistory`（kana/tel/addressのいずれかが値を持つか）を
  追加し、履歴の有無で文言を出し分けるよう修正（loop 48 の実装の続き）。
- `.claude/skills/loop-instruction/SKILL.md` に「Playwrightでの動作確認」節を新設。
  検証手順（開発サーバー起動→`npx tsx scripts/e2e/*.mjs`実行→自己クリーンアップ）と、
  今回ハマった点（`"server-only"`ガード、`.ts`importにtsxが必要、日付衝突、
  `.env`/`dev.db`が揮発する場合がある、管理画面のBasic認証）を明記。
  「ループの実行手順」のステップ4（検証）から参照するようにし、UI変更は必ずここを
  通るようにした。

### 結果
- ESLint 0・テスト 53 件パス・`next build` 成功。
- `scripts/e2e/checkout-autofill.mjs` を実行し **PASS**（1回目=会員情報のみ自動入力・
  案内文なし、2回目=電話番号/住所も自動入力・案内文あり、をどちらもアサート通り確認）。
  実行後にテストユーザー・予約が自己削除されることも確認。

### 気づき・次への申し送り
- この環境には `chromium-cli` は無いが `@playwright/test` は使える。今後UIに関わる
  ループは、curlだけで済ませず本節の手順で実地確認すること。
- Playwrightスクリプトから`lib/*.ts`（`"server-only"`import）を直接importできない点は
  ハマりやすいので、DB直接操作が要る場合はPrismaクライアントを自前で組み立てる。

---

## loop 48 — 予約申込フォームの自動入力（2026-08-18）

### 経緯
- ユーザーからローカル確認中に「予約申し込みでいちいち情報をいれるのはなぜ？」と指摘。
  調査の結果、`CheckoutView` の初期値が常に空文字列で、ログイン中でも会員情報・過去の
  予約内容を一切参照していないことが判明（実装漏れ）。対応範囲をユーザーに確認し、
  「ログイン中のみ自動入力」で合意。

### やったこと
- `lib/reservation-repository.ts`: `getLatestReservationContact(userId)` を追加
  （直近の予約から kana/tel/method/address を取得。履歴が無ければ null）。
- `app/(site)/checkout/page.tsx`: サーバーコンポーネント化し、`getCurrentUser()` と
  `getLatestReservationContact()` から初期値（name/email/kana/tel/method/address）を
  組み立てて `CheckoutView` に渡す。未ログイン時は `undefined`（従来通り空フォーム）。
- `components/CheckoutView.tsx`: `initialValues` プロップを受け取り
  `{ ...initialForm, ...initialValues }` で初期状態に反映。自動入力時は
  「会員情報と前回のご注文内容から自動入力しています」という案内文をフォーム上部に表示
  （値は全て編集可能な通常の controlled input のまま）。

### 結果
- ESLint 0・テスト 53 件パス・`next build` 成功（`/checkout` は引き続き dynamic）。
- `getLatestReservationContact` と同一クエリを直接実行し、既存のテストアカウント
  （`shuji30@gmail.com`、予約履歴あり）に対して kana/tel/method/address が正しく返る
  ことを確認。存在しないユーザーIDでは null を返すことも確認。
- 開発サーバーを再起動し `/`・`/checkout`・`/login` が200、未ログインの `/mypage` が
  307（ログインへリダイレクト）であることを確認。
- **未検証の範囲**：この環境には chromium-cli 等のブラウザ自動操作ツールが無く、
  `CheckoutView` はカート状態を localStorage から読むクライアントコンポーネントのため、
  実際に入力欄へ値が反映される様子は curl では確認できない（SSR時点では読み込み中表示に
  なるため）。ユーザーに実ブラウザでの確認を依頼した。

### 気づき・次への申し送り
- ゲスト（未ログイン）の自動入力は今回スコープ外（ユーザーの選択）。要望があれば
  localStorage を使ったゲスト向け自動入力を別ループで追加できる。
- 決済フローについても同様の質問があったため、`/orders`・`/mypage` からの
  ワンクリック決済という設計を口頭で説明済み（コード変更なし）。

---

## loop 47 — 管理画面にレビュー管理（削除）を追加（2026-08-18）

### やったこと
- **Gitブランチの異常を検出・修正**：ループ開始時、作業ディレクトリのブランチが
  `master`（loop 46 のコミット `c125756` を含む）から `claude/loop-instruction-skill-3adxwh`
  （それを含まない古い状態）に切り替わっていることを発見。ユーザー操作外の変化だったため、
  ユーザーに確認（AskUserQuestion）した上で `master` に戻して続行。コミット自体は失われて
  いなかった（`git log --all` で両ブランチから到達可能なことを確認済み）。
- ROADMAP残タスクを確認（環境制約2件は変わらず）。誰でも自由な文面でレビュー投稿できる一方、
  管理側に非表示・削除の手段が無い点はギャップと判断し、「管理画面（loop 19〜22）」の下に
  レビュー管理（モデレーション）を新規タスクとして追記した上で着手。
- `lib/review-repository.ts`: 商品名付き合わせロジックを `attachKimonoNames` に共通化し
  （`getLatestReviews` もこちらを利用するようリファクタ）、`getAllReviewsForAdmin`（全件・新しい順、
  商品削除済みなら「(削除済み商品)」表示）と `deleteReview(id)` を追加。
- `lib/actions/admin-review.ts`: `deleteReviewAction`（削除後に `/admin/reviews`・該当商品詳細・
  トップページを revalidate）。`/admin` 配下なので middleware の Basic認証で保護される
  （`updateReservationStatus` と同じ方針）。
- `components/DeleteReviewButton.tsx`（`CancelButton` を踏襲：確認ダイアログ→送信→`router.refresh()`）。
- `app/admin/reviews/page.tsx`（一覧・星評価・投稿日・商品名リンク・削除ボタン、0件時の空表示）。
  管理レイアウトのナビゲーションに「レビュー管理」を追加。

### 結果
- ESLint 0件・vitest 53件パス・`next build` 成功（`/admin/reviews` ルート追加を確認）。
- 本番ビルドを起動し実地確認：Basic認証なしは401、認証ありは200。テストレビューを1件投入して
  一覧に表示されること、DB上で削除すると一覧が即座に0件表示（`force-dynamic` でキャッシュなし）
  に戻ることを確認。`deleteReviewAction`/`DeleteReviewButton` 自体はブラウザ未使用のため未クリック
  検証だが、`updateReservationStatus`/`StatusControl` と全く同型の実装。
- 確認に使った一時レビュー・一時スクリプトはすべて削除済み。`git status` はコード差分のみ。

### 気づき・次への申し送り
- **環境の再確認事項**：この作業ディレクトリは前回に続き `web/node_modules` 等が揮発する場合が
  あるほか、今回は**作業ブランチ自体がセッション外要因で切り替わる**ことも起こり得ると判明。
  次ループ開始時は `git branch --show-current` と `git log --oneline -3` で
  「`master` か」「loop番号が最新か」を必ず確認し、ズレていれば独断で書き換えず一旦ユーザーに確認する。
- ROADMAPの残タスクは環境制約2件（Capacitor実機ビルド／GCP実デプロイ）のみに戻った。
  新機能を追加する場合は今回同様「既存機能の明確なギャップを埋める」範囲に留め、大きな方針転換は
  ユーザー確認を挟む。

---

## loop 46 — トップページに「お客様の声」を表示（2026-08-18）

### やったこと
- ROADMAP残タスクを確認した結果、未着手2件（Capacitor実機ビルド／GCP実デプロイ）はいずれも
  この環境では実行不可（要 macOS+Xcode・Android Studio / 要 GCPプロジェクト・課金）と明記済みのため、
  loop 42 の申し送りで候補に挙がっていた「トップページに最新レビューの抜粋を表示」に着手。
- `lib/review-repository.ts`: `getLatestReviews(limit)` を追加。全商品横断で最新レビューを取得し、
  Review-Kimono間にPrismaリレーションが無いためアプリ側で商品名を付き合わせ（該当商品が
  見つからない場合は除外）。
- `app/(site)/page.tsx`: 「選ばれる理由」と「ご利用の流れ」の間に「お客様の声」セクションを追加。
  レビュー0件時はセクションごと非表示（既存の空表示パターンを踏襲）。各カードは該当商品の
  詳細ページ（`#reviews`）へリンク。星評価・投稿日（`formatJP`）・コメント（`line-clamp-3`）・
  投稿者名＋商品名を表示。

### 結果
- 検証にあたり `web/node_modules` が未インストール（`.env` も未作成）と判明したため、
  `npm ci` → `.env.example` を `.env` にコピー → `prisma migrate deploy`（8件のマイグレーション適用）
  → `npm run db:seed` を実施し、ローカル検証環境を再構築。
- ESLint 0件・vitest 53件パス・`next build` 成功。
- 本番ビルドを起動しAPI/DB込みで実地確認：レビュー0件時はセクション非表示（200 OK）、
  レビュー1件を一時投入した状態では「お客様の声」セクションに投稿者名・商品名・コメントが
  正しく表示されることを確認。確認後、投入したテストレビューと一時スクリプトは削除済み。

### 気づき・次への申し送り
- **環境メモ**：この作業ディレクトリでは `web/node_modules`・`web/.env`・`web/dev.db` の中身（マイグレーション適用・シード）
  が永続化されないことがある。次ループでビルド系の検証をする際は、まず `npm ci` と
  `.env.example` の複製、`prisma migrate deploy`＋`npm run db:seed` の要否を確認すること。
- ROADMAPの残タスクは環境制約2件のみ（Capacitor実機ビルド／GCP実デプロイ）。いずれも人間の作業が
  必要で、このループでは着手不可。次に何を優先すべきかはユーザーに確認するのが良い
  （新規機能を追加する場合はスコープ拡大になるためROADMAPへの追記合意が必要）。

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
