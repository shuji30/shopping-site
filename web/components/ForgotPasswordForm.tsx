"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await requestPasswordReset({ email });
      if (!res.ok) {
        setError(res.error ?? "送信に失敗しました。");
        return;
      }
      setDone(true);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

  if (done) {
    return (
      <div className="mt-8 max-w-md rounded-lg border border-kin/20 bg-white/60 p-6">
        <p className="text-sm leading-relaxed text-sumi/80">
          ご入力のメールアドレスが登録されている場合、パスワード再設定用のメールを
          送信しました。メール内のリンクから新しいパスワードを設定してください
          （リンクの有効期限は1時間です）。
        </p>
        <p className="mt-4 text-sm text-sumi/70">
          <Link href="/login" className="text-kon underline underline-offset-4">
            ログインページに戻る
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 max-w-md space-y-4 rounded-lg border border-kin/20 bg-white/60 p-6"
    >
      <p className="text-sm text-sumi/70">
        ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>
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
      <button
        type="submit"
        disabled={loading}
        className={
          loading
            ? "w-full cursor-wait rounded-full bg-kin/50 px-6 py-3 text-sm font-medium text-sumi/60"
            : "w-full rounded-full bg-kin px-6 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
        }
      >
        {loading ? "送信中..." : "再設定メールを送信"}
      </button>
      {error && (
        <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
          {error}
        </p>
      )}
      <p className="text-sm text-sumi/70">
        <Link href="/login" className="text-kon underline underline-offset-4">
          ログインページに戻る
        </Link>
      </p>
    </form>
  );
}
