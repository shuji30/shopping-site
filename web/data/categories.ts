import type { KimonoCategory } from "@/lib/types";

/**
 * カテゴリマスタの初期データ（seed 用）。
 *
 * loop 71 で `lib/categories.ts` のハードコードから移した。**アプリの実行時は
 * これを参照せず、DB の Category テーブルを読む**（管理画面から登録・変更・
 * 削除できるようにするため）。ここは新しい環境を立ち上げるときの初期値。
 */
export const initialCategories: KimonoCategory[] = [
  {
    id: "furisode",
    label: "振袖",
    description: "成人式や結婚式に映える、未婚女性の第一礼装。",
    sortOrder: 10,
  },
  {
    id: "houmongi",
    label: "訪問着",
    description: "結婚式やお茶会など、幅広い場に着られる準礼装。",
    sortOrder: 20,
  },
  {
    id: "tomesode",
    label: "留袖",
    description: "既婚女性の第一礼装。親族の結婚式などに。",
    sortOrder: 30,
  },
  {
    id: "tsukesage",
    label: "付け下げ",
    description: "控えめな柄付けで、上品に着こなせる略礼装。",
    sortOrder: 40,
  },
  {
    id: "hakama",
    label: "袴",
    description: "卒業式に人気。凛とした佇まいを演出。",
    sortOrder: 50,
  },
  {
    id: "yukata",
    label: "浴衣",
    description: "夏祭りや花火大会に。気軽に楽しめる普段着。",
    sortOrder: 60,
  },
];
