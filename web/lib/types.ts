// 着物レンタルECサイトのドメイン型定義

/** 着物のカテゴリ識別子 */
export type KimonoCategoryId =
  | "furisode" // 振袖
  | "houmongi" // 訪問着
  | "tomesode" // 留袖
  | "hakama" // 袴
  | "yukata" // 浴衣
  | "tsukesage"; // 付け下げ

/** 着物1点のデータ */
export interface Kimono {
  /** 一意なID（URLのスラッグにも使う） */
  id: string;
  /** 商品名 */
  name: string;
  /** カテゴリ */
  category: KimonoCategoryId;
  /** レンタル料金（税込・円） */
  price: number;
  /** レンタル期間（日数） */
  rentalDays: number;
  /** 対応サイズ（例: "S", "M", "L", "フリー"） */
  sizes: string[];
  /** 主な色 */
  colors: string[];
  /** 素材（例: "正絹", "ポリエステル"） */
  material: string;
  /** 商品説明 */
  description: string;
  /**
   * 画像の識別に使うシード文字列の配列。
   * MVP では実写真の代わりに、このシードから生成するプレースホルダ画像を表示する。
   * 実写真が用意でき次第、画像URLへ差し替える。
   */
  images: string[];
  /** 在庫（貸出可能）かどうか */
  inStock: boolean;
  /** トップページの注目商品として扱うか */
  featured?: boolean;
}

/** カテゴリの表示用メタデータ */
export interface KimonoCategory {
  id: KimonoCategoryId;
  /** 表示名（日本語） */
  label: string;
  /** 短い説明 */
  description: string;
}
