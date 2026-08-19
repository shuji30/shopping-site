"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/mail-templates";

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
  passwordConfirm: string;
}): Promise<AuthResult> {
  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim();
  const password = input.password ?? "";
  const passwordConfirm = input.passwordConfirm ?? "";

  if (!name || !email) {
    return { ok: false, error: "お名前とメールアドレスを入力してください。" };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "メールアドレスの形式が正しくありません。" };
  }
  if (password.length < 8) {
    return { ok: false, error: "パスワードは8文字以上で設定してください。" };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "パスワードが一致しません。" };
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

/** ログイン */
export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";
  if (!email || !password) {
    return { ok: false, error: "メールアドレスとパスワードを入力してください。" };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  // ユーザー不在でも照合を行い、存在有無を推測されにくくする
  const valid =
    !!user && verifyPassword(password, user.passwordHash);
  if (!user || !valid) {
    return {
      ok: false,
      error: "メールアドレスまたはパスワードが正しくありません。",
    };
  }
  await createSession(user.id);
  return { ok: true };
}

/** ログアウト（フォームの action として使用） */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * パスワード再設定メールをリクエストする。
 * メールアドレスの登録有無を推測されないよう、対象が存在してもしなくても
 * 常に ok:true を返す（実際の送信は登録がある場合のみ行われる）。
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<AuthResult> {
  const email = input.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "メールアドレスの形式が正しくありません。" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const { subject, body } = passwordResetEmail({
      name: user.name,
      resetUrl: `/reset-password?token=${token}`,
    });
    await sendMail({ to: user.email, subject, body, kind: "password_reset" });
  }

  return { ok: true };
}

/** パスワード再設定トークンを検証し、有効なら新しいパスワードを設定してログインする。 */
export async function resetPassword(input: {
  token: string;
  password: string;
  passwordConfirm: string;
}): Promise<AuthResult> {
  const token = input.token?.trim();
  const password = input.password ?? "";
  const passwordConfirm = input.passwordConfirm ?? "";

  if (!token) {
    return { ok: false, error: "無効なリンクです。" };
  }
  if (password.length < 8) {
    return { ok: false, error: "パスワードは8文字以上で設定してください。" };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "パスワードが一致しません。" };
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return {
      ok: false,
      error: "リンクの有効期限が切れているか、既に使用されています。もう一度パスワード再設定をお試しください。",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password) },
  });
  await createSession(userId);
  return { ok: true };
}

