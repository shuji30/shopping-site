import type { KimonoCategory, KimonoCategoryId } from "./types";

/** カテゴリの一覧（表示順） */
export const categories: KimonoCategory[] = [
  {
    id: "furisode",
    label: "振袖",
    description: "成人式や結婚式に映える、未婚女性の第一礼装。",
  },
  {
    id: "houmongi",
    label: "訪問着",
    description: "結婚式やお茶会など、幅広い場に着られる準礼装。",
  },
  {
    id: "tomesode",
    label: "留袖",
    description: "既婚女性の第一礼装。親族の結婚式などに。",
  },
  {
    id: "tsukesage",
    label: "付け下げ",
    description: "控えめな柄付けで、上品に着こなせる略礼装。",
  },
  {
    id: "hakama",
    label: "袴",
    description: "卒業式に人気。凛とした佇まいを演出。",
  },
  {
    id: "yukata",
    label: "浴衣",
    description: "夏祭りや花火大会に。気軽に楽しめる普段着。",
  },
];

/** ID からカテゴリを引く */
export function getCategory(id: KimonoCategoryId): KimonoCategory | undefined {
  return categories.find((c) => c.id === id);
}

/** ID からカテゴリの表示名を引く（見つからなければ ID をそのまま返す） */
export function getCategoryLabel(id: KimonoCategoryId): string {
  return getCategory(id)?.label ?? id;
}
