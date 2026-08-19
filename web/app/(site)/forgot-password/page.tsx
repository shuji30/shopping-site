import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "パスワードをお忘れの方",
  description: "登録済みメールアドレス宛にパスワード再設定用のリンクを送信します。",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">パスワードをお忘れの方</h1>
      <ForgotPasswordForm />
    </div>
  );
}
