# きものレンタル 雅 — 着物レンタルECサイト

振袖・訪問着・卒業袴・浴衣などをネットでレンタルできるECサイトです。
レスポンシブWebとして構築し、将来的に Capacitor でiOS/Androidアプリ化することを想定しています。

> このリポジトリは開発中のサンプルです。掲載商品・価格・画像はダミーデータです。

## 技術スタック

- **Next.js 16**（App Router）+ **TypeScript**
- **Tailwind CSS 4**（デザイントークンは `app/globals.css` の `@theme` に定義）
- フォント: Noto Serif JP / Noto Sans JP（`next/font`）
- **Prisma 7**（開発: SQLite / 本番: PostgreSQL）— `DATABASE_URL` のスキームでアダプタを自動選択
  （本番移行手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)）
- カートはクライアント側（React Context + localStorage）
- 将来: **Capacitor**（Web コードをそのままアプリへ）

## セットアップと起動

```bash
cd web
npm install                 # 依存関係（postinstall で prisma generate も実行）
cp .env.example .env        # DATABASE_URL を設定
npx prisma migrate dev      # DB作成＋マイグレーション適用
npm run db:seed             # サンプル商品を投入

# 管理画面(/admin)を使う場合は .env の ADMIN_PASSWORD を設定（未設定だと全拒否）

npm run dev                 # 開発サーバー（http://localhost:3000）
npm run build               # 本番ビルド（※事前に migrate + seed が必要）
npm run start               # 本番ビルドの起動
npm run lint                # ESLint
npm test                    # 単体テスト（Vitest）
```

> **注意**: トップ・商品詳細はビルド時に DB を参照して静的生成します。
> デプロイ時は「マイグレーション＋シード → ビルド」の順で実行してください。

### DB 関連スクリプト

- `npm run db:migrate` — マイグレーション作成・適用（`prisma migrate dev`）
- `npm run db:seed` — サンプルデータ投入
- `npm run db:reset` — DB をリセットして再適用

## ディレクトリ構成

```
web/
├─ app/
│  ├─ layout.tsx           # 共通レイアウト（Header/Footer、フォント、CartProvider）
│  ├─ page.tsx             # トップページ（ヒーロー/カテゴリ/注目商品）
│  ├─ kimonos/page.tsx     # 商品一覧（カテゴリ絞り込み）
│  ├─ kimono/[id]/page.tsx # 商品詳細（SSG）
│  ├─ cart/page.tsx        # カート
│  ├─ checkout/page.tsx    # 予約申込
│  └─ (site)/layout.tsx    # 店舗フロント共通レイアウト（Header/Footer）
├─ app/admin/             # 管理画面（Basic認証で保護。ダッシュボード/予約一覧/予約詳細）
├─ middleware.ts          # /admin の Basic 認証
├─ components/             # Header/Footer/ProductCard/KimonoImage/Cart*/Checkout* など
├─ lib/
│  ├─ types.ts             # ドメイン型（Kimono など）
│  ├─ categories.ts        # カテゴリ定義
│  ├─ db.ts                # Prisma クライアント（libSQL アダプタ）
│  ├─ kimono-repository.ts # 商品の取得（DB経由）
│  ├─ cart.tsx             # カート状態（Context + localStorage）
│  ├─ date.ts              # 日付ヘルパー
│  └─ actions/reservation.ts # 予約申込のサーバーアクション（DB保存）
├─ data/
│  └─ kimonos.ts           # サンプル商品データ（シードの情報源）
└─ prisma/
   ├─ schema.prisma        # Kimono / Reservation / ReservationItem
   ├─ migrations/          # マイグレーション履歴
   └─ seed.ts              # シードスクリプト
```

## 現在のスコープ

- ✅ 商品カタログ（トップ / 一覧・カテゴリ絞り込み / 詳細）
- ✅ レスポンシブ対応（スマホ / タブレット / PC）
- ✅ カート（サイズ・レンタル開始日の選択、localStorage 永続化）
- ✅ 予約申込フォーム → **DB に保存**（決済はまだ無し）
- ✅ 商品・予約のデータ永続化（Prisma + SQLite）
- ✅ 在庫管理（貸出中期間の表示・二重予約防止）
- ✅ 配送・返却フロー（予約ステータス／返却期限）
- ✅ 会員機能（登録・ログイン／マイページの予約履歴、scryptハッシュ＋セッション）
- ✅ 予約照会（受付番号＋メール）
- ✅ 管理画面（/admin）— 予約の一覧・詳細・集計・ステータス更新（Basic認証で保護）

## 今後の予定

在庫カレンダー / ユーザー認証 / オンライン決済（Stripe 等） /
予約・配送・返却フロー / 本番DB（Postgres 等）への移行 / Capacitor でのアプリ化。

## 画像について

実写真の代わりに、`KimonoImage` がシード文字列から和柄プレースホルダを生成します。
実写真が用意でき次第、商品データの `images` を実際の画像パス/URL に差し替え、
`KimonoImage` を `next/image` などへ置き換えてください。
