# CI/CD（GitHub Actions）

`develop`で開発し、`master`への push（人間が行う）をトリガーに Cloud Run へ
自動デプロイする構成。詳細な手動デプロイ手順は [DEPLOY-GCP.md](DEPLOY-GCP.md) を参照。

## ブランチ運用

- **開発は `develop` ブランチ**で行う（詳細は
  `.claude/skills/loop-instruction/SKILL.md` の「Git運用」節）。
- **`master` は本番相当**。`master` が更新されると下記CDが自動的に発火し、
  **即座に本番（Cloud Run）へ反映される**。

### 本番反映は Pull Request 経由を既定とする

`develop` → `master` の PR を作り、CI が通ったことを確認してからマージする。
直接 `git push origin master` でも反映はできるが、次の理由からPRを既定とする。

- **何を本番に出したかが記録に残る**。直マージだとコミット履歴しか残らず、
  「動作確認したか」「反映時に注意することがあったか」が後から追えない。
- **マージ前にCIの結果を1か所で確認できる**。
- **切り戻しの単位が明確**（PRのマージコミットを revert すればよい）。

PR本文は `.github/pull_request_template.md` の枠を埋める形で書く。
とくに **「本番反映時の注意」と「デプロイ後の確認」** は、
マージする人が読む前提で必ず記入すること。

```bash
# 例: develop の内容を本番へ出す PR を作る
gh pr create --base master --head develop --title "release: loop NN までを本番反映"
```

Claude が反映作業を代行するのは、ユーザーから「pushして」「本番反映して」等の
**明示的な指示があった場合のみ**（SKILL.md の禁止事項を参照）。

### CI を必須にする設定（未実施・人間の作業）

現状ブランチ保護は設定していないため、CI が赤いままでもマージできてしまう。
GitHub の Settings → Branches → Add branch protection rule で `master` に対し、

- Require a pull request before merging
- Require status checks to pass before merging → `lint-test-build` を選択

を設定すると、CI 通過を必須にできる。リポジトリ管理者の操作が必要なため、
ここでは手順の記載に留める。

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
