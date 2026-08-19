"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/actions/auth";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await register({ name, email, password, passwordConfirm });
      if (!res.ok) {
        setError(res.error ?? "登録に失敗しました。");
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
        <label htmlFor="name" className="text-sm font-medium text-sumi/80">
          お名前
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>
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
          パスワード（8文字以上）
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label
          htmlFor="password-confirm"
          className="text-sm font-medium text-sumi/80"
        >
          パスワード（確認）
        </label>
        <input
          id="password-confirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
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
        {loading ? "登録中..." : "登録する"}
      </button>
      {error && (
        <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
          {error}
        </p>
      )}
      <p className="text-sm text-sumi/70">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-kon underline underline-offset-4">
          ログイン
        </Link>
      </p>
    </form>
  );
}
