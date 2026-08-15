import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // コンテナ（Cloud Run 等）向けに自己完結した最小サーバーを出力する。
  // .next/standalone/server.js を node で起動できる（node_modules を持ち込まない）。
  output: "standalone",

  // Prisma の生成クライアント（lib/generated/prisma 配下の wasm 等を含む）が
  // standalone のトレースに確実に含まれるよう明示する。
  outputFileTracingIncludes: {
    "/**": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;
