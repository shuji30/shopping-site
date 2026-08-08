"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { KimonoImage } from "./KimonoImage";
import { formatJP, rentalEndDate } from "@/lib/date";

export function CartView() {
  const { items, removeItem, clear, total, count, ready } = useCart();

  // localStorage 読み込み前はちらつき防止のプレースホルダ
  if (!ready) {
    return <p className="mt-8 text-sm text-sumi/60">読み込み中...</p>;
  }

  if (count === 0) {
    return (
      <div className="mt-10 rounded-lg border border-kin/20 bg-white/60 px-6 py-16 text-center">
        <p className="text-sumi/70">カートは空です。</p>
        <Link
          href="/kimonos"
          className="mt-4 inline-block rounded-full bg-kon px-6 py-2.5 text-sm text-washi transition hover:bg-kon-light"
        >
          着物を探す
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* 明細一覧 */}
      <ul className="space-y-4 lg:col-span-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-4 rounded-lg border border-kin/20 bg-white/60 p-4"
          >
            <Link
              href={`/kimono/${item.kimonoId}`}
              className="shrink-0"
              aria-label={item.name}
            >
              <KimonoImage
                seed={item.imageSeed}
                motif={item.name.slice(0, 1)}
                className="aspect-[3/4] w-20 rounded-md"
              />
            </Link>
            <div className="flex flex-1 flex-col">
              <Link
                href={`/kimono/${item.kimonoId}`}
                className="font-serif text-sumi hover:text-kon"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-sumi/70">サイズ: {item.size}</p>
              <p className="text-sm text-sumi/70">
                利用期間: {formatJP(item.startDate)} 〜{" "}
                {formatJP(rentalEndDate(item.startDate, item.rentalDays))}（
                {item.rentalDays}日間）
              </p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <p className="font-semibold text-kon">
                  ¥{item.price.toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-sumi/50 underline-offset-4 transition hover:text-enji hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* 合計・手続き */}
      <aside className="h-fit rounded-lg border border-kin/20 bg-white/60 p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-sumi/70">合計（{count}点）</span>
          <span className="text-2xl font-semibold text-kon">
            ¥{total.toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-full bg-kin/40 px-6 py-3 text-sm font-medium text-sumi/60"
        >
          予約手続きへ進む（準備中）
        </button>
        <p className="mt-2 text-xs text-sumi/50">
          ※ オンライン決済・予約確定は次のフェーズで実装予定です。
        </p>
        <button
          type="button"
          onClick={clear}
          className="mt-4 w-full text-sm text-sumi/50 underline-offset-4 hover:text-enji hover:underline"
        >
          カートを空にする
        </button>
        <Link
          href="/kimonos"
          className="mt-4 block text-center text-sm text-kon underline-offset-4 hover:underline"
        >
          買い物を続ける →
        </Link>
      </aside>
    </div>
  );
}
