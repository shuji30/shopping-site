import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

/** パスワードを scrypt でソルト付きハッシュ化（"salt:hash" 形式） */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** パスワード照合（タイミング安全比較） */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

/** セッションを作成し、httpOnly Cookie を設定する（Server Action から呼ぶ） */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** 現在のセッションを破棄し Cookie を削除する */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    store.delete(SESSION_COOKIE);
  }
}

const RESET_TOKEN_HOURS = 1;

/**
 * パスワード再設定トークンを発行する（有効期限1時間）。
 * 同一ユーザーの既存トークンは全て無効化してから発行する（複数回リクエストされても
 * 最新のリンクだけが有効になるようにするため）。
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { token, userId, expiresAt } });
  return token;
}

/**
 * パスワード再設定トークンを検証する。有効なら対象の userId を返し、
 * トークンは使い捨てのためその場で削除する。無効・期限切れなら null。
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return null;
  await prisma.passwordResetToken.delete({ where: { token } });
  if (record.expiresAt < new Date()) return null;
  return record.userId;
}

/** ログイン中のユーザーを返す（未ログインは null）。期限切れセッションは無効。 */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
