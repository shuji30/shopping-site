"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Kimono } from "@/lib/types";
import { useCart, makeCartItemId, type CartItem } from "@/lib/cart";
import { toISODate, rentalEndDate, formatJP } from "@/lib/date";

/** 商品詳細の購入操作（サイズ・レンタル開始日を選んでカートに追加） */
export function AddToCartForm({ kimono }: { kimono: Kimono }) {
  const { addItem, items } = useCart();
  const [size, setSize] = useState<string>(kimono.sizes[0] ?? "");
  const [startDate, setStartDate] = useState<string>("");

  const min = toISODate(new Date());

  const currentId =
    size && startDate ? makeCartItemId(kimono.id, size, startDate) : "";
  const inCart = currentId ? items.some((i) => i.id === currentId) : false;

  const endDate = useMemo(
    () => (startDate ? rentalEndDate(startDate, kimono.rentalDays) : ""),
    [startDate, kimono.rentalDays],
  );

  const canAdd = kimono.inStock && !!size && !!startDate && !inCart;

  function handleAdd() {
    if (!canAdd) return;
    const item: CartItem = {
      id: currentId,
      kimonoId: kimono.id,
      name: kimono.name,
      size,
      startDate,
      rentalDays: kimono.rentalDays,
      price: kimono.price,
      imageSeed: kimono.images[0] ?? kimono.id,
    };
    addItem(item);
  }

  if (!kimono.inStock) {
    return (
      <div className="mt-8">
        <p className="rounded-lg bg-washi-dark px-4 py-3 text-sm text-sumi/70">
          この着物は現在貸出中です。返却後の再入荷をお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* サイズ選択 */}
      <div>
        <p className="text-sm font-medium text-sumi/80">サイズ</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {kimono.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={
                size === s
                  ? "rounded-md bg-kon px-4 py-2 text-sm text-washi"
                  : "rounded-md border border-kin/40 px-4 py-2 text-sm text-sumi/80 transition hover:border-kin"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* レンタル開始日 */}
      <div>
        <label
          htmlFor="start-date"
          className="text-sm font-medium text-sumi/80"
        >
          レンタル開始日
        </label>
        <input
          id="start-date"
          type="date"
          min={min}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-2 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none sm:w-auto"
        />
        {endDate && (
          <p className="mt-2 text-sm text-sumi/70">
            利用期間: {formatJP(startDate)} 〜 {formatJP(endDate)}（
            {kimono.rentalDays}日間）
          </p>
        )}
      </div>

      {/* カートに追加 */}
      <div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={
            canAdd
              ? "w-full rounded-full bg-kin px-8 py-3 text-sm font-medium text-sumi transition hover:bg-kin/90"
              : "w-full cursor-not-allowed rounded-full bg-kin/40 px-8 py-3 text-sm font-medium text-sumi/60"
          }
        >
          {inCart ? "カートに入っています" : "カートに追加"}
        </button>
        {!startDate && (
          <p className="mt-2 text-xs text-sumi/50">
            ※ サイズとレンタル開始日を選択してください。
          </p>
        )}
        {inCart && (
          <Link
            href="/cart"
            className="mt-3 inline-block text-sm text-kon underline-offset-4 hover:underline"
          >
            カートを見る →
          </Link>
        )}
      </div>
    </div>
  );
}
