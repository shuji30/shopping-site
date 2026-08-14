import { NextResponse, type NextRequest } from "next/server";

// /admin 以下を HTTP Basic 認証で保護する。
// 認証情報は環境変数 ADMIN_USER / ADMIN_PASSWORD で設定。
// ADMIN_PASSWORD が未設定の場合は fail-closed（すべて拒否）とし、誤って公開しないようにする。
export function middleware(req: NextRequest) {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "";

  const auth = req.headers.get("authorization");
  if (expectedPass && auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user === expectedUser && pass === expectedPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
