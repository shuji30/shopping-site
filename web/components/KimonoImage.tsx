// 実写真の代わりに、シード文字列から決定的に生成する和風プレースホルダ画像。
// 実写真が用意でき次第、このコンポーネントを <img>/next Image に差し替える。

const palettes: [string, string][] = [
  ["#16324f", "#24507a"], // 紺
  ["#9b2d30", "#c25b4e"], // 臙脂
  ["#4f6b3a", "#8a9a5b"], // 若草
  ["#6d3f66", "#a86f97"], // 古代紫
  ["#b0872f", "#d8b45a"], // 金茶
  ["#2f6b6b", "#4f9a9a"], // 青緑
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function KimonoImage({
  seed,
  motif,
  className = "",
}: {
  /** 色柄を決定づけるシード（商品の画像ID等） */
  seed: string;
  /** 中央に配す家紋風の一文字（省略可） */
  motif?: string;
  className?: string;
}) {
  const h = hashStr(seed);
  const [c1, c2] = palettes[h % palettes.length];
  const gid = `grad-${seed}`;
  const pid = `wave-${seed}`;

  return (
    <div className={`relative overflow-hidden bg-kon ${className}`}>
      <svg
        viewBox="0 0 300 400"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
          {/* 青海波（せいがいは）風パターン */}
          <pattern
            id={pid}
            width="40"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 20 A20 20 0 0 1 40 20"
              fill="none"
              stroke="white"
              strokeOpacity="0.12"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect width="300" height="400" fill={`url(#${gid})`} />
        <rect width="300" height="400" fill={`url(#${pid})`} />
        {motif && (
          <g>
            <circle
              cx="150"
              cy="185"
              r="56"
              fill="none"
              stroke="white"
              strokeOpacity="0.7"
              strokeWidth="1.5"
            />
            <text
              x="150"
              y="185"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="52"
              fill="white"
              fillOpacity="0.92"
              fontFamily="serif"
            >
              {motif}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
