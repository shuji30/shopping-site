# GCP（Cloud Run）への公開手順

雅（Next.js）はサーバーレンダリング（Server Actions・DB・Cookie認証）で動くため、
GCP では **Cloud Run（コンテナ）** で公開します。静的ホスティング（Cloud Storage 等）
ではサーバー機能が動かないので使えません。

- コンテナ定義: `web/Dockerfile`（`output:"standalone"` を利用した最小サーバー）
- 実行: Cloud Run が `$PORT`(既定8080) で待受、`node server.js` を起動
- DB: `lib/db.ts` が `DATABASE_URL` のスキームでアダプタを自動選択する
  （`postgres://`→Cloud SQL、`libsql://`/`file:`→Turso/SQLite）

## DBの選択：Turso（推奨）か Cloud SQL か

| | Turso（推奨） | Cloud SQL(PostgreSQL) |
|---|---|---|
| 費用 | 無料枠内で運用可能（サンプル用途なら十分） | 稼働中は月額約10〜15米ドル（`db-f1-micro`でもゼロスケールしない） |
| コード変更 | 不要（schema.prismaは`sqlite`のまま、既存のSQLite方言マイグレーションがそのまま使える） | `schema.prisma`のproviderを`postgresql`に変更し、マイグレーションを作り直す必要あり |
| 必要なアカウント | [turso.tech](https://turso.tech) の別アカウント | GCPのみで完結 |
| 手順 | 本ドキュメントの 2A | 本ドキュメントの 2B |

このアプリは元々SQLite（libSQLアダプタ）で作られているため、Turso（libSQLのホスティング
サービス）を使うと**コード変更なし・完全無料**でDBを持てる。「100%GCPで完結させたい」
「Postgresでないと困る」といった事情がなければ Turso を推奨する。

> **これは人間が自分のマシンで行う作業です**。`gcloud`/`turso` の認証・課金有効な
> GCPプロジェクトが必要で、開発コンテナ内では実行できません
> （Windows は Turso CLI のネイティブビルドが無いため WSL 経由で実行する）。

---

## 0. 準備するもの

- `gcloud` CLI（[インストール](https://cloud.google.com/sdk/docs/install)）
- **課金が有効な GCP プロジェクト**
- 権限: Cloud Run 管理者 / Artifact Registry 管理者 / Cloud Build 編集者
  （Cloud SQLを使う場合は追加でCloud SQL管理者）
- Turso を使う場合: `turso` CLI（[インストール](https://docs.turso.tech/cli/installation)。
  Windowsはビルド無し→WSLで `curl -sSfL https://get.tur.so/install.sh | bash`）

```bash
# 共通の変数（自分の値に置き換える）
export PROJECT=your-gcp-project
export REGION=asia-northeast1          # 東京
gcloud config set project "$PROJECT"
```

---

## 1. API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
# Cloud SQLを使う場合のみ追加: sqladmin.googleapis.com
```

---

## 2A. DBを作る（Turso・推奨）

```bash
turso auth login                 # 初回のみ。ブラウザでログイン/サインアップ
turso db create miyabi
turso db show miyabi --url       # → DATABASE_URL に使う（libsql://...）
turso db tokens create miyabi    # → TURSO_AUTH_TOKEN に使う
```

マイグレーションを適用する（**Prisma CLIは`libsql://`を直接扱えない**ため、
既存の `prisma/migrations/*/migration.sql` を1件ずつ直接流し込む）:

```bash
for d in prisma/migrations/*/; do
  [ -f "$d/migration.sql" ] && turso db shell miyabi < "$d/migration.sql"
done
turso db shell miyabi ".tables"  # テーブルが揃っているか確認
```

ローカルの `web/.env` を一時的にTurso向けに書き換えてシード・動作確認する
（`web/.env.example` にひな形あり）:

```env
DATABASE_URL="libsql://<db名>-<組織名>.turso.io"
TURSO_AUTH_TOKEN="<turso db tokens create の出力>"
```

```bash
npm run db:seed   # サンプル商品を投入（lib/db.ts がTursoに自動接続）
npm run dev       # ローカルでTurso接続を確認してから次へ
```

> **注意**: `curl` だけでの確認は避けること。このアプリのページはNext.jsの
> ストリーミングSSRを使っており、`curl`は初期シェルの断片しか見えず実データが
> あっても空に見えることがある（`.claude/skills/loop-instruction/SKILL.md` 参照）。
> 必ずPlaywright（`scripts/e2e/`）か実ブラウザで確認する。

Turso利用時はスキーマ変更不要のため、**手順3はスキップして手順4へ**進む。

## 2B. DBを作る（Cloud SQL/PostgreSQL・代替案）

```bash
export INSTANCE=miyabi-db
export DB=miyabi
export DBUSER=miyabi
export DBPASS='＜安全なパスワード＞'

gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="$REGION"

gcloud sql databases create "$DB" --instance="$INSTANCE"
gcloud sql users create "$DBUSER" --instance="$INSTANCE" --password="$DBPASS"

# 接続名（PROJECT:REGION:INSTANCE）を控える
gcloud sql instances describe "$INSTANCE" --format='value(connectionName)'
```

費用を抑えたい場合は、使わない時間帯に停止できる:

```bash
gcloud sql instances patch "$INSTANCE" --activation-policy=NEVER  # 停止（課金はストレージ分のみ）
gcloud sql instances patch "$INSTANCE" --activation-policy=ALWAYS # 再開
```

---

## 3. スキーマを Postgres 用にしてマイグレーション（Cloud SQLを選んだ場合のみ）

`prisma/migrations` の既存 SQL は **SQLite 方言** のため、Postgres では作り直します。

1. `prisma/schema.prisma` の provider を変更:

   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```

2. **Cloud SQL Auth Proxy** を起動してローカルから接続（別ターミナル）:

   ```bash
   cloud-sql-proxy "$PROJECT:$REGION:$INSTANCE"   # 127.0.0.1:5432 で待受
   ```

3. 初回はベースラインを作成し、以降は `deploy`:

   ```bash
   export DATABASE_URL="postgresql://$DBUSER:$DBPASS@127.0.0.1:5432/$DB"
   rm -rf prisma/migrations           # SQLite用履歴を退避 or 別管理
   npx prisma migrate dev --name init # 初回のみ（以降は prisma migrate deploy）
   npm run db:seed                    # 任意：サンプル商品を投入
   ```

> 詳細な背景は [DEPLOYMENT.md](DEPLOYMENT.md) を参照。

---

## 4. コンテナをビルドして Artifact Registry へ push

```bash
# リポジトリ作成（初回のみ）
gcloud artifacts repositories create miyabi \
  --repository-format=docker --location="$REGION"

# web/ ディレクトリで実行。Dockerfile を使って Cloud Build がビルド＆push
cd web
gcloud builds submit \
  --tag "$REGION-docker.pkg.dev/$PROJECT/miyabi/web:latest"
```

---

## 5. Cloud Run にデプロイ

パスワード等は **Secret Manager** に入れるのが安全です。

### Turso を使う場合

```bash
# シークレット登録（初回のみ）
printf '%s' "$(turso db tokens create miyabi)" | gcloud secrets create miyabi-turso-token --data-file=-
printf '%s' '＜管理画面パスワード＞' | gcloud secrets create miyabi-admin-pass --data-file=-

gcloud run deploy miyabi \
  --image "$REGION-docker.pkg.dev/$PROJECT/miyabi/web:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,ADMIN_USER=admin,DATABASE_URL=$(turso db show miyabi --url)" \
  --update-secrets "ADMIN_PASSWORD=miyabi-admin-pass:latest,TURSO_AUTH_TOKEN=miyabi-turso-token:latest"
```

### Cloud SQL を使う場合

```bash
# シークレット登録（初回のみ）
printf '%s' "$DBPASS" | gcloud secrets create miyabi-db-pass --data-file=-
printf '%s' '＜管理画面パスワード＞' | gcloud secrets create miyabi-admin-pass --data-file=-

export CONN="$PROJECT:$REGION:$INSTANCE"

gcloud run deploy miyabi \
  --image "$REGION-docker.pkg.dev/$PROJECT/miyabi/web:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$CONN" \
  --set-env-vars "NODE_ENV=production,ADMIN_USER=admin" \
  --set-env-vars "^@^DATABASE_URL=postgresql://$DBUSER@localhost/$DB?host=/cloudsql/$CONN" \
  --update-secrets "ADMIN_PASSWORD=miyabi-admin-pass:latest"
```

> **Cloud SQL への接続**: `--add-cloudsql-instances` を付けると、コンテナ内の
> Unix ソケット `/cloudsql/PROJECT:REGION:INSTANCE` 経由で接続できます。上の
> `DATABASE_URL` はその形式（`host=/cloudsql/...`）です。パスワードはソケット接続でも
> 必要な構成なら `:$DBPASS` を含めるか、`PGPASSWORD` 相当をシークレットで渡します。
>
> `^@^` は `--set-env-vars` の**区切り文字を @ に変える**指定です（URL 内のカンマ対策）。

デプロイ完了後、表示される **Service URL** をブラウザで開いて動作確認します
（`curl`だけでなく、実ブラウザかPlaywrightで確認すること）。

---

## 6. 継続的な更新

- **アプリの更新**: `gcloud builds submit ...`（手順4）→ `gcloud run deploy ...`（手順5）を
  再実行するだけ。トラフィックは新リビジョンへ自動で切り替わります。
- **スキーマ変更時**: マイグレーションを追加し、デプロイ前に
  `prisma migrate deploy`（Cloud SQL Auth Proxy 経由 or Cloud Run ジョブ）を実行します。
- **Capacitor アプリ**: `server.url` にこの Cloud Run の URL を設定すれば、
  iOS/Android アプリもそのままこの本番環境を表示します（[CAPACITOR-runbook.md](CAPACITOR-runbook.md)）。

---

## 補足

- **スケール**: Cloud Run は既定でゼロスケール（アクセスが無いと課金されにくい）。
  常時起動やコールドスタート対策が要れば `--min-instances=1` を検討。
- **接続数**: 同時実行が増えると Cloud SQL の接続が増えます。必要なら
  Cloud Run の `--max-instances` や Cloud SQL のプーラー、`--concurrency` を調整。
- **リージョン**: Cloud Run と Cloud SQL は同一リージョンにするとレイテンシ・コストで有利。
- **独自ドメイン**: Cloud Run の「ドメインのマッピング」またはロードバランサで割当。
