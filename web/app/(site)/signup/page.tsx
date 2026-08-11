import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "会員登録",
  description: "会員登録して予約履歴の確認などをご利用いただけます。",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">会員登録</h1>
      <p className="mt-2 text-sm text-sumi/70">
        登録すると、マイページから予約履歴を確認できます。
      </p>
      <SignupForm />
    </div>
  );
}
