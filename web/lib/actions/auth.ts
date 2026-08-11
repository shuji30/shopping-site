"use server";

import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 会員登録（成功時はそのままログイン状態にする） */
export async function register(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResult> {
  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim();
  const password = input.password ?? "";

  if (!name || !email) {
    return { ok: false, error: "お名前とメールアドレスを入力してください。" };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "メールアドレスの形式が正しくありません。" };
  }
  if (password.length < 8) {
    return { ok: false, error: "パスワードは8文字以上で設定してください。" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "このメールアドレスは既に登録されています。" };
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash: hashPassword(password) },
  });
  await createSession(user.id);
  return { ok: true };
}
