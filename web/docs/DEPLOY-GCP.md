# GCP（Cloud Run）への公開手順

雅（Next.js）はサーバーレンダリング（Server Actions・DB・Cookie認証）で動くため、
GCP では **Cloud Run（コンテナ）＋ Cloud SQL for PostgreSQL** で公開します。
静的ホスティング（Cloud Storage 等）ではサーバー機能が動かないので使えません。

- コンテナ定義: `web/Dockerfile`（`output:"standalone"` を利用した最小サーバー）
- 実行: Cloud Run が `$PORT`(既定8080) で待受、`node server.js` を起動
- DB: Cloud SQL(PostgreSQL) に接続（`lib/db.ts` が `DATABASE_URL` でアダプタ自動選択）

> **これは人間が自分のマシンで行う作業です**。`gcloud` の認証・課金有効なGCPプロジェクト・
> Cloud SQL の作成が必要で、開発コンテナ内では実行できません。

---

## 0. 準備するもの

- `gcloud` CLI（[インストール](https://cloud.google.com/sdk/docs/install)）
- **課金が有効な GCP プロジェクト**
- 権限: Cloud Run 管理者 / Cloud SQL 管理者 / Artifact Registry 管理者 / Cloud Build 編集者
- （任意）Cloud SQL Auth Proxy … ローカルからマイグレーションを流すため

```bash
# 共通の変数（自分の値に置き換える）
export PROJECT=your-gcp-project
export REGION=asia-northeast1          # 東京
export INSTANCE=miyabi-db
export DB=miyabi
export DBUSER=miyabi
export DBPASS='＜安全なパスワード＞'
gcloud config set project "$PROJECT"
```

---

## 1. API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

---

## 2. Cloud SQL（PostgreSQL）を作成

```bash
gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="$REGION"

gcloud sql databases create "$DB" --instance="$INSTANCE"
gcloud sql users create "$DBUSER" --instance="$INSTANCE" --password="$DBPASS"

# 接続名（PROJECT:REGION:INSTANCE）を控える
gcloud sql instances describe "$INSTANCE" --format='value(connectionName)'
```

---

## 3. スキーマを Postgres 用にしてマイグレーション

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

デプロイ完了後、表示される **Service URL** をブラウザで開いて動作確認します。

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
