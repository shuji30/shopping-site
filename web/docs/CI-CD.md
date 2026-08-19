# CI/CD（GitHub Actions）

`develop`で開発し、`master`への push（人間が行う）をトリガーに Cloud Run へ
自動デプロイする構成。詳細な手動デプロイ手順は [DEPLOY-GCP.md](DEPLOY-GCP.md) を参照。

## ブランチ運用

- **開発は `develop` ブランチ**で行う（詳細は
  `.claude/skills/loop-instruction/SKILL.md` の「Git運用」節）。
- **`master` は本番相当**。`develop` の内容をマージして
  `git push origin master` すると、下記CDが自動的に発火する。
  **`master` への push は必ず人間が行う。**

## CI（`.github/workflows/ci.yml`）

- トリガー: `develop`/`master` への push、および両ブランチへの pull request。
- 内容: `web/` ディレクトリで `npm ci` → `lint` → `test` → `build`。
- 実DBへは接続しない（`DATABASE_URL=file:./dev.db` のダミー値で、
  `prisma generate`/`next build` が要求する環境変数の存在だけを満たす）。
- Playwright e2e（`scripts/e2e/`）はここには含まれない。TursoやAdmin認証など
  実環境の秘密情報が要るため、現状は手動実行のみ（SKILL.md参照）。

## CD（`.github/workflows/deploy.yml`）

- トリガー: `master` への push、または手動実行（`workflow_dispatch`。
  再デプロイの動作確認用）。
- 認証: **Workload Identity Federation**（サービスアカウントキーを使わない）。
  GitHub Actions の OIDC トークンを使い、`github-deployer` サービスアカウントに
  一時的になりすます。GitHub側にシークレットの登録は不要。
- 手順: `web/` を Docker ビルド → Artifact Registry へ push
  （タグは `github.sha`）→ `gcloud run deploy` で Cloud Run を更新。
- `DATABASE_URL`/`TURSO_AUTH_TOKEN`/`ADMIN_USER`/`ADMIN_PASSWORD` は
  **指定しない**＝既存リビジョンの設定（Secret Manager参照含む）がそのまま
  引き継がれる（`gcloud run deploy` は明示的に上書きしない限り前リビジョンの
  設定を保持するため）。

## GCP側の設定（構築済み・参考）

以下は `webprog36` プロジェクトに対して実施済み（再構築する場合の記録）。

```bash
PROJECT=webprog36
PROJECT_NUMBER=294448459831
REPO=shuji30/shopping-site
SA_EMAIL=github-deployer@$PROJECT.iam.gserviceaccount.com

# デプロイ用サービスアカウント
gcloud iam service-accounts create github-deployer --project=$PROJECT
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role=roles/run.admin
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role=roles/artifactregistry.writer
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role=roles/iam.serviceAccountUser

# Workload Identity Pool / Provider（このリポジトリに限定）
gcloud iam workload-identity-pools create github-pool --project=$PROJECT --location=global
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT --location=global --workload-identity-pool=github-pool \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# GitHubのこのリポジトリからのみ、上記サービスアカウントを名乗れるようにする
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL --project=$PROJECT \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/$REPO"
```

Provider リソース名（ワークフローにハードコードしている値）:
```
projects/294448459831/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

## 動作確認

- CI: `develop` に push（または `develop`/`master` 宛のPRを作成）すると
  GitHub Actionsの「CI」ワークフローが走る。
- CD: `master` に push すると自動デプロイされる。push せずに動作確認したい
  場合は、GitHubの Actions タブから「Deploy to Cloud Run」を
  `workflow_dispatch` で手動実行できる。
