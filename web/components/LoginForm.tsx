"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email, password });
      if (!res.ok) {
        setError(res.error ?? "ログインに失敗しました。");
        return;
      }
      router.push("/mypage");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 max-w-md space-y-4 rounded-lg border border-kin/20 bg-white/60 p-6"
    >
      <div>
        <label htmlFor="email" className="text-sm font-medium text-sumi/80">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-sumi/80">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className={
          loading
            ? "w-full cursor-wait rounded-full bg-kin/50 px-6 py-3 text-sm font-medium text-sumi/60"
            : "w-full rounded-full bg-kin px-6 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
        }
      >
        {loading ? "ログイン中..." : "ログイン"}
      </button>
      {error && (
        <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
          {error}
        </p>
      )}
      <p className="text-sm text-sumi/70">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-kon underline underline-offset-4">
          会員登録
        </Link>
      </p>
    </form>
  );
}
