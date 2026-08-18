"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatJP, rentalEndDate } from "@/lib/date";
import {
  createReservation,
  type ReservationLine,
} from "@/lib/actions/reservation";

type ReceiveMethod = "delivery" | "store";

interface FormState {
  name: string;
  kana: string;
  email: string;
  tel: string;
  method: ReceiveMethod;
  address: string;
  note: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  kana: "",
  email: "",
  tel: "",
  method: "delivery",
  address: "",
  note: "",
};

/** ログイン中なら会員情報＋直近の予約内容で埋める初期値（サーバー側で取得して渡す） */
type InitialValues = Partial<Omit<FormState, "note">>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "お名前を入力してください。";
  if (!form.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "メールアドレスの形式が正しくありません。";
  }
  if (!form.tel.trim()) errors.tel = "電話番号を入力してください。";
  if (form.method === "delivery" && !form.address.trim()) {
    errors.address = "配送先のご住所を入力してください。";
  }
  return errors;
}

export function CheckoutView({
  initialValues,
}: {
  initialValues?: InitialValues;
}) {
  const { items, total, count, ready, clear } = useCart();
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    orderNumber: string;
    items: ReservationLine[];
    total: number;
    method: ReceiveMethod;
  } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createReservation({
        name: form.name,
        kana: form.kana,
        email: form.email,
        tel: form.tel,
        method: form.method,
        address: form.address,
        note: form.note,
        items: items.map((i) => ({
          kimonoId: i.kimonoId,
          size: i.size,
          startDate: i.startDate,
        })),
      });
      if (!result.ok || !result.orderNumber) {
        setSubmitError(result.error ?? "申込に失敗しました。");
        return;
      }
      // DB に保存された内容（サーバー確定値）で完了画面を表示
      clear();
      setDone({
        orderNumber: result.orderNumber,
        items: result.items ?? [],
        total: result.total ?? 0,
        method: form.method,
      });
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch {
      setSubmitError(
        "通信エラーが発生しました。時間をおいて再度お試しください。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // 完了画面
  if (done) {
    return (
      <div className="mt-8 rounded-lg border border-kin/20 bg-white/60 p-8">
        <p className="font-serif text-2xl text-kon">お申込ありがとうございます</p>
        <p className="mt-3 text-sm text-sumi/80">
          受付番号: <span className="font-semibold">{done.orderNumber}</span>
        </p>
        <p className="mt-1 text-sm text-sumi/70">
          受取方法: {done.method === "delivery" ? "配送" : "店頭受取"}
        </p>

        <ul className="mt-6 divide-y divide-kin/20 border-y border-kin/20">
          {done.items.map((item, idx) => (
            <li key={idx} className="flex justify-between py-3 text-sm">
              <span className="text-sumi/90">
                {item.name}（{item.size} / {formatJP(item.startDate)}〜）
              </span>
              <span className="text-sumi/80">
                ¥{item.price.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right font-semibold text-kon">
          合計 ¥{done.total.toLocaleString()}
        </p>

        <p className="mt-4 text-sm text-sumi/70">
          受付番号とメールアドレスで、
          <Link
            href="/orders"
            className="text-kon underline underline-offset-4"
          >
            予約照会
          </Link>
          からいつでも内容の確認とオンライン決済ができます。
        </p>

        <p className="mt-6 rounded-md bg-washi-dark px-4 py-3 text-xs text-sumi/60">
          ※ これはサンプルサイトです。オンライン決済はテストモードで、実際の課金・確認メール送信は行われません。
        </p>
        <Link
          href="/kimonos"
          className="mt-6 inline-block rounded-full bg-kon px-6 py-2.5 text-sm text-washi transition hover:bg-kon-light"
        >
          買い物を続ける
        </Link>
      </div>
    );
  }

  // 読み込み前
  if (!ready) {
    return <p className="mt-8 text-sm text-sumi/60">読み込み中...</p>;
  }

  // カートが空
  if (count === 0) {
    return (
      <div className="mt-10 rounded-lg border border-kin/20 bg-white/60 px-6 py-16 text-center">
        <p className="text-sumi/70">カートに商品がありません。</p>
        <Link
          href="/kimonos"
          className="mt-4 inline-block rounded-full bg-kon px-6 py-2.5 text-sm text-washi transition hover:bg-kon-light"
        >
          着物を探す
        </Link>
      </div>
    );
  }

  const fieldClass =
    "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-2" noValidate>
        {initialValues && (
          <p className="rounded-md bg-kon/5 px-4 py-3 text-xs text-sumi/70">
            会員情報と前回のご注文内容から自動入力しています。内容は自由に変更できます。
          </p>
        )}
        <div>
          <label htmlFor="name" className="text-sm font-medium text-sumi/80">
            お名前 <span className="text-enji">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={fieldClass}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-enji">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="kana" className="text-sm font-medium text-sumi/80">
            フリガナ
          </label>
          <input
            id="kana"
            type="text"
            value={form.kana}
            onChange={(e) => update("kana", e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-sumi/80">
            メールアドレス <span className="text-enji">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={fieldClass}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-enji">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="tel" className="text-sm font-medium text-sumi/80">
            電話番号 <span className="text-enji">*</span>
          </label>
          <input
            id="tel"
            type="tel"
            value={form.tel}
            onChange={(e) => update("tel", e.target.value)}
            className={fieldClass}
          />
          {errors.tel && <p className="mt-1 text-xs text-enji">{errors.tel}</p>}
        </div>

        <div>
          <span className="text-sm font-medium text-sumi/80">受取方法</span>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={form.method === "delivery"}
                onChange={() => update("method", "delivery")}
              />
              配送
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={form.method === "store"}
                onChange={() => update("method", "store")}
              />
              店頭受取
            </label>
          </div>
        </div>

        {form.method === "delivery" && (
          <div>
            <label
              htmlFor="address"
              className="text-sm font-medium text-sumi/80"
            >
              配送先住所 <span className="text-enji">*</span>
            </label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={fieldClass}
            />
            {errors.address && (
              <p className="mt-1 text-xs text-enji">{errors.address}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="note" className="text-sm font-medium text-sumi/80">
            備考（ご要望など）
          </label>
          <textarea
            id="note"
            rows={3}
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            className={fieldClass}
          />
        </div>

        {submitError && (
          <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={
            submitting
              ? "w-full cursor-wait rounded-full bg-kin/50 px-8 py-3 text-sm font-medium text-sumi/60"
              : "w-full rounded-full bg-kin px-8 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
          }
        >
          {submitting ? "送信中..." : "この内容で申し込む"}
        </button>
        <p className="text-xs text-sumi/50">
          ※ 決済は行いません。お申込内容はサーバーに保存されます（サンプル）。
        </p>
      </form>

      {/* 注文内容サマリ */}
      <aside className="h-fit rounded-lg border border-kin/20 bg-white/60 p-6">
        <p className="text-sm font-medium text-sumi/80">ご注文内容</p>
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="text-sumi/90">{item.name}</p>
              <p className="text-xs text-sumi/60">
                {item.size} / {formatJP(item.startDate)}〜
                {formatJP(rentalEndDate(item.startDate, item.rentalDays))}
              </p>
              <p className="text-xs text-kon">
                ¥{item.price.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-kin/20 pt-4">
          <span className="text-sm text-sumi/70">合計（{count}点）</span>
          <span className="text-xl font-semibold text-kon">
            ¥{total.toLocaleString()}
          </span>
        </div>
        <Link
          href="/cart"
          className="mt-4 block text-center text-sm text-kon underline-offset-4 hover:underline"
        >
          ← カートに戻る
        </Link>
      </aside>
    </div>
  );
}
