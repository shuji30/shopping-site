"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

/** ヘッダーのカートボタン（件数バッジ付き） */
export function CartButton() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1 text-sumi/80 transition-colors hover:text-kon"
      aria-label={`カート（${count}点）`}
    >
      {/* カートアイコン */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="hidden sm:inline">カート</span>
      {ready && count > 0 && (
        <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-enji px-1 text-xs text-washi">
          {count}
        </span>
      )}
    </Link>
  );
}
