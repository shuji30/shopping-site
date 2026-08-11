# デプロイと本番DB（Postgres）移行

開発では **SQLite**、本番では **PostgreSQL** を推奨します。アプリのコードは
`lib/db.ts` が `DATABASE_URL` のスキームを見てドライバアダプタを自動選択するため、
コードの分岐は不要です。

- `postgres://` / `postgresql://` → `PrismaPg`
- `file:` など → `PrismaLibSql`（SQLite）

## データモデルの移植性

`sizes` / `colors` / `images` は SQLite に配列型が無いため **JSON 文字列（text）** で
保存しています。これは PostgreSQL でもそのまま動作するため、移行時のデータ表現の
変更は不要です（将来 Postgres の `text[]` / `jsonb` に最適化することは可能）。

## Postgres への切り替え手順

1. **Postgres を用意**し、接続文字列を取得（例: `postgresql://user:pass@host:5432/miyabi`）。

2. **環境変数**を設定:

   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/miyabi"
   ADMIN_USER="admin"
   ADMIN_PASSWORD="＜安全な値＞"
   NODE_ENV="production"
   ```

3. **スキーマの provider を変更**（`prisma/schema.prisma`）:

   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```

4. **マイグレーションのベースラインを作成**。
   `prisma/migrations` の既存 SQL は SQLite 方言のため Postgres には適用できません。
   新しい本番DBに対してベースラインを作り直します:

   ```bash
   # SQLite 用の履歴を退避（または新規ブランチで管理）
   rm -rf prisma/migrations
   # Postgres に対して初期マイグレーションを生成・適用
   DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
   ```

   既に本番でスキーマを運用する場合は、以降 `prisma migrate deploy` を CI/本番で実行します。

5. **クライアント生成**（`postinstall` で自動実行）:

   ```bash
   npx prisma generate
   ```

6. **シード（任意）** — 初期商品を投入する場合:

   ```bash
   npm run db:seed
   ```

7. **ビルドと起動**:

   ```bash
   npm run build
   npm run start
   ```

   > トップ・商品一覧・詳細などは実行時に DB を参照します（動的レンダリング）。
   > ビルド時にシード済みDBは必須ではありませんが、**実行時に DB へ到達できること**が必要です。

## 環境変数まとめ

| 変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | 接続先。スキームでアダプタを自動選択 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `/admin` の Basic 認証（未設定時は全拒否） |
| `NODE_ENV` | `production` でセッション Cookie を `secure` に |

## 接続プールの注意（サーバーレス）

サーバーレス環境（Vercel 等）では接続数が増えやすいため、PgBouncer などの
プーラー経由の接続文字列を推奨します。`lib/db.ts` は開発時のみ Prisma クライアントを
グローバルに使い回して接続増加を抑えています。
