import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "ログイン",
  description: "会員ログイン。",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">ログイン</h1>
      <LoginForm />
    </div>
  );
}
