# きものレンタル 雅 — 着物レンタルECサイト

振袖・訪問着・卒業袴・浴衣などをネットでレンタルできるECサイトです。
レスポンシブWebとして構築し、将来的に Capacitor でiOS/Androidアプリ化することを想定しています。

> このリポジトリは開発中のサンプルです。掲載商品・価格・画像はダミーデータです。

## 技術スタック

- **Next.js 16**（App Router）+ **TypeScript**
- **Tailwind CSS 4**（デザイントークンは `app/globals.css` の `@theme` に定義）
- フォント: Noto Serif JP / Noto Sans JP（`next/font`）
- 将来: **Capacitor**（Web コードをそのままアプリへ）

## セットアップと起動

```bash
cd web
npm install        # 依存関係のインストール
npm run dev        # 開発サーバー（http://localhost:3000）
npm run build      # 本番ビルド
npm run start      # 本番ビルドの起動
npm run lint       # ESLint
```

## ディレクトリ構成

```
web/
├─ app/
│  ├─ layout.tsx          # 共通レイアウト（Header/Footer、フォント、メタデータ）
│  ├─ page.tsx            # トップページ（ヒーロー/カテゴリ/注目商品）
│  ├─ kimonos/page.tsx    # 商品一覧（カテゴリ絞り込み）
│  └─ kimono/[id]/page.tsx# 商品詳細（SSG）
├─ components/
│  ├─ Header.tsx / Footer.tsx
│  ├─ ProductCard.tsx     # 商品カード
│  └─ KimonoImage.tsx     # 和柄プレースホルダ画像（実写真の代替）
├─ lib/
│  ├─ types.ts            # ドメイン型（Kimono など）
│  └─ categories.ts       # カテゴリ定義
└─ data/
   └─ kimonos.ts          # サンプル商品データ
```

## 現在のスコープ（MVP）

商品カタログの表示のみ:

- ✅ トップページ
- ✅ 商品一覧（カテゴリ絞り込み）
- ✅ 商品詳細
- ✅ スマホ / タブレット / PC のレスポンシブ対応

## 今後の予定（Phase 2 以降）

カート / レンタル期間選択 / 在庫カレンダー / ユーザー認証 / オンライン決済（Stripe 等） /
予約・配送・返却フロー / データ永続化（DB・CMS）/ Capacitor でのアプリ化。

## 画像について

MVP では実写真の代わりに、`KimonoImage` がシード文字列から和柄プレースホルダを生成します。
実写真が用意でき次第、`data/kimonos.ts` の `images` を実際の画像パス/URL に差し替え、
`KimonoImage` を `next/image` などへ置き換えてください。
