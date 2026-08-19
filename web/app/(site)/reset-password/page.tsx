import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "パスワードの再設定",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">パスワードの再設定</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="mt-8 max-w-md rounded-lg border border-kin/20 bg-white/60 p-6 text-sm text-sumi/70">
          リンクが正しくありません。パスワード再設定メールに記載されたリンクから
          アクセスしてください。
        </p>
      )}
    </div>
  );
}
