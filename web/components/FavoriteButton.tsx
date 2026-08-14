"use client";

import { useFavorites } from "@/lib/favorites";

/**
 * お気に入りのトグル（ハート）ボタン。
 * ProductCard の <Link> 内に置いても遷移しないよう、クリックの既定動作と伝播を止める。
 */
export function FavoriteButton({
  kimonoId,
  variant = "overlay",
}: {
  kimonoId: string;
  /** overlay: カード上の丸ボタン / inline: 詳細ページのラベル付きボタン */
  variant?: "overlay" | "inline";
}) {
  const { has, toggle, ready } = useFavorites();
  const active = ready && has(kimonoId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(kimonoId);
  }

  const heart = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );

  const label = active ? "お気に入りから削除" : "お気に入りに追加";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        className={
          active
            ? "inline-flex items-center gap-2 rounded-full border border-enji/40 bg-enji/5 px-4 py-2 text-sm font-medium text-enji transition"
            : "inline-flex items-center gap-2 rounded-full border border-kin/40 px-4 py-2 text-sm font-medium text-sumi/80 transition hover:border-kin hover:text-enji"
        }
      >
        {heart}
        {active ? "お気に入り済み" : "お気に入り"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={
        active
          ? "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-enji shadow-sm transition hover:bg-white"
          : "flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sumi/50 shadow-sm transition hover:bg-white hover:text-enji"
      }
    >
      {heart}
    </button>
  );
}
