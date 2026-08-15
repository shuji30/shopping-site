import "server-only";
import { prisma } from "./db";

// メール送信（モック）。サンプルのため実際には送信せず、送信内容を DB(EmailLog) に
// 記録するだけにする。実運用では SendGrid / Amazon SES 等の呼び出しにこの関数の
// 中身を差し替える（呼び出し側 sendMail のインターフェースは維持）。

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  /** メール種別（例: "reservation_confirmation"） */
  kind: string;
  /** 関連予約ID（あれば） */
  reservationId?: string;
}

export async function sendMail(input: SendMailInput): Promise<void> {
  await prisma.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      body: input.body,
      kind: input.kind,
      reservationId: input.reservationId ?? null,
    },
  });
  // 開発時に送信が分かるようログ（本番の実送信時も監査用に残してよい）
  console.log(`[mail:mock] to=${input.to} subject=${input.subject}`);
}
