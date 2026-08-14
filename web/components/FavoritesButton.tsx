"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";

/** ヘッダーのお気に入りボタン（件数バッジ付き） */
export function FavoritesButton() {
  const { count, ready } = useFavorites();

  return (
    <Link
      href="/favorites"
      className="relative flex items-center gap-1 text-sumi/80 transition-colors hover:text-kon"
      aria-label={`お気に入り（${count}件）`}
    >
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
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      <span className="hidden sm:inline">お気に入り</span>
      {ready && count > 0 && (
        <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-enji px-1 text-xs text-washi">
          {count}
        </span>
      )}
    </Link>
  );
}
