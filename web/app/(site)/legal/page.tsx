import type { Metadata } from "next";
import { legalEntries } from "@/data/legal";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "特定商取引法に基づく事業者情報・販売条件・返品/キャンセルについて。",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl text-kon">特定商取引法に基づく表記</h1>
      <dl className="mt-8 divide-y divide-kin/20 rounded-lg border border-kin/20 bg-white/60 px-5">
        {legalEntries.map((entry) => (
          <div
            key={entry.label}
            className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6"
          >
            <dt className="shrink-0 text-sm font-medium text-sumi/60 sm:w-40">
              {entry.label}
            </dt>
            <dd className="whitespace-pre-wrap text-sm leading-relaxed text-sumi/90">
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-xs text-sumi/50">
        ※ 本ページの内容はサンプルサイトのため、実在の事業者情報ではありません。
      </p>
    </div>
  );
}
