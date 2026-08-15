# 雅（Next.js）を Cloud Run 等のコンテナで動かすための本番イメージ。
# next.config.ts の output:"standalone" を利用し、最小サーバーだけを同梱する。
#
# 注意（本番DB）: Cloud SQL(PostgreSQL) を使う場合は、ビルド前に
#   prisma/schema.prisma の provider を "postgresql" にし、Postgres 用に
#   マイグレーションを作り直す（docs/DEPLOYMENT.md / docs/DEPLOY-GCP.md 参照）。
#   マイグレーション適用（prisma migrate deploy）はこのイメージには含めず、
#   デプロイ手順側で別途実行する。

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# postinstall の `prisma generate` に必要なファイルを先に置く
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# 残りのソースをコピーしてビルド
COPY . .
RUN npm run build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run は $PORT(既定8080)で待受を要求。全インターフェースにバインドする。
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# 非rootユーザーで実行
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# standalone 出力＋静的アセットのみを取り込む
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
