// 着物レンタルECサイトのドメイン型定義

/**
 * 着物のカテゴリ識別子。
 * loop 71 でカテゴリをDBマスタ化したため、値をユニオン型で固定できなくなった
 * （管理画面から自由に追加できる）。読みやすさのために別名だけ残している。
 */
export type KimonoCategoryId = string;

/** 着物1点のデータ */
export interface Kimono {
  /** 一意なID（URLのスラッグにも使う） */
  id: string;
  /** 商品名 */
  name: string;
  /** カテゴリ識別子 */
  category: KimonoCategoryId;
  /**
   * カテゴリの表示名。DB から引くたびに解決して埋める。
   * クライアントコンポーネント（ProductCard など）はDBに触れないため、
   * 表示に必要なラベルは商品と一緒に持ち回る。
   * カテゴリが削除済みなどで引けない場合は識別子をそのまま入れる。
   */
  categoryLabel: string;
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

/**
 * 初期データ（data/kimonos.ts）や seed で使う商品の型。
 * カテゴリ表示名は DB から解決するものなので、投入時には持たない。
 */
export type KimonoSeed = Omit<Kimono, "categoryLabel">;

/** カテゴリマスタ（DBの Category テーブルに対応） */
export interface KimonoCategory {
  id: KimonoCategoryId;
  /** 表示名（日本語） */
  label: string;
  /** 短い説明 */
  description: string;
  /** 表示順（小さいほど先） */
  sortOrder: number;
}
