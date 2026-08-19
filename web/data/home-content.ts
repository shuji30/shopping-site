// トップページ（PR＝宣伝部分）の文言データ。
// legal.ts と同じ方針で、表示（app/(site)/page.tsx）とデータを分離してある。
// 実運用ではここの文字列を差し替えるだけで打ち出しを変えられる。
// 金額・レンタル日数は実データから算出するのでここには持たせない（嘘にならないように）。

import type { KimonoCategoryId } from "@/lib/types";

export const hero = {
  eyebrow: "KIMONO RENTAL 雅",
  title: ["晴れの日を、", "美しい一枚とともに。"],
  lead:
    "成人式・卒業式・結婚式に。振袖から浴衣まで、ネットで選んで自宅に届く着物レンタル。" +
    "サイズと柄からお気に入りの一枚をお選びいただけます。",
  primaryCta: { label: "着物を探す", href: "/kimonos" },
  secondaryCta: { label: "ご利用の流れを見る", href: "#flow" },
};

/** 申込前の不安をヒーロー直下で解消するための短い訴求。金額・日数は別途実データを添える */
export const assurances: { label: string; value: string }[] = [
  { label: "配送・返却", value: "全国配送。返却は同梱の伝票で送るだけ" },
  { label: "キャンセル", value: "発送前ならマイページから無料でキャンセル" },
  { label: "お支払い", value: "オンライン決済（テストモード）" },
];

/** 利用シーンからの導線。カテゴリと1対1で対応させ、一覧へ絞り込みリンクする */
export interface Scene {
  /** 利用シーン（お客様の言葉） */
  scene: string;
  /** 対応する着物の種類 */
  category: KimonoCategoryId;
  categoryLabel: string;
  note: string;
}

export const scenes: Scene[] = [
  {
    scene: "成人式",
    category: "furisode",
    categoryLabel: "振袖",
    note: "一生に一度の晴れ姿に。華やかな古典柄からモダン柄まで。",
  },
  {
    scene: "卒業式",
    category: "hakama",
    categoryLabel: "袴",
    note: "凛とした佇まいを演出。着物との組み合わせも選べます。",
  },
  {
    scene: "結婚式・披露宴",
    category: "houmongi",
    categoryLabel: "訪問着",
    note: "ゲストとして品よく。お茶会や式典にも。",
  },
  {
    scene: "親族の結婚式",
    category: "tomesode",
    categoryLabel: "留袖",
    note: "既婚女性の第一礼装。格を保ちたい場面に。",
  },
  {
    scene: "お茶会・観劇",
    category: "tsukesage",
    categoryLabel: "付け下げ",
    note: "控えめな柄付けで、上品に着こなせます。",
  },
  {
    scene: "夏祭り・花火大会",
    category: "yukata",
    categoryLabel: "浴衣",
    note: "気軽に和装を楽しみたい日に。",
  },
];

export const features = [
  {
    icon: "🚚",
    title: "全国どこでも配送",
    body: "ご自宅までお届け。返却も同梱の伝票で送るだけ。店頭受取もお選びいただけます。",
  },
  {
    icon: "👘",
    title: "豊富なサイズ・柄",
    body: "振袖から浴衣まで、S〜Lの幅広いサイズと季節の柄を取り揃えています。",
  },
  {
    icon: "✨",
    title: "安心のクリーニング",
    body: "専門スタッフによる仕上げでいつも清潔。万一の汚れも安心保証つき（サンプル）。",
  },
];

export const steps = [
  {
    title: "選ぶ",
    body: "お好みの着物・サイズ・レンタル開始日を選んでカートに入れます。",
  },
  {
    title: "予約する",
    body: "お客様情報を入力してお申し込み。受付番号が発行されます。",
  },
  {
    title: "受け取る",
    body: "開始日に合わせて配送、または店頭でお受け取りください。",
  },
  {
    title: "返却する",
    body: "ご利用後は同梱の伝票で返送するだけ。面倒な手間はありません。",
  },
];

export const closingCta = {
  title: "特別な一日に、特別な一枚を。",
  lead: "気になる一枚は、レンタル開始日を選んでそのままご予約いただけます。",
  cta: { label: "着物を探す", href: "/kimonos" },
  /** 決め手に欠ける人向けの補足。カタログの規模・金額は実データから差し込む */
  noteTemplate: "現在 {count} 点を掲載中。レンタル料 {price}／{days} のご利用です。",
};
