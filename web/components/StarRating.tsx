import { MAX_RATING } from "@/lib/reviews";

/** 星評価の表示（読み取り専用）。value は 0〜5、0.5刻みの端数は四捨五入で塗り分け。 */
export function StarRating({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-kin"
      role="img"
      aria-label={`5段階中 ${value} の評価`}
    >
      {Array.from({ length: MAX_RATING }, (_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95z" />
          </svg>
        );
      })}
    </span>
  );
}
