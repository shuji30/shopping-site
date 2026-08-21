// 商品マスタの入力検証（純粋ロジック）。
// 管理画面のフォームとサーバーアクションの両方から呼ぶ。
// カテゴリ（lib/category-validation.ts）と同じ方針で、判定と文言を1か所に集約する。
//
// フォームからは全項目が文字列で来る。数値・真偽値・配列への変換もここで行い、
// 「画面の入力」と「DBに入れる値」の橋渡しを純粋関数としてテストできるようにする。

export interface KimonoInput {
  id: string;
  name: string;
  category: string;
  /** フォームからは文字列で来る */
  price: string | number;
  rentalDays: string | number;
  /** カンマ・読点・空白区切りで受ける */
  sizes: string;
  colors: string;
  images: string;
  material: string;
  description: string;
  inStock: boolean;
  featured: boolean;
}

export type KimonoField =
  | "id"
  | "name"
  | "category"
  | "price"
  | "rentalDays"
  | "sizes"
  | "colors"
  | "images"
  | "material"
  | "description";

export type KimonoErrors = Partial<Record<KimonoField, string>>;

/** 識別子は商品URL `/kimono/<id>` に出るので半角小文字・数字・ハイフンに限る */
export const KIMONO_ID_PATTERN = /^[a-z0-9-]+$/;

export const KIMONO_ID_MAX = 64;
export const KIMONO_NAME_MAX = 60;
export const KIMONO_MATERIAL_MAX = 40;
export const KIMONO_DESCRIPTION_MAX = 400;
/** 料金の上限。桁の打ち間違い（0を1つ多い等）を弾くための現実的な上限 */
export const KIMONO_PRICE_MAX = 1_000_000;
export const KIMONO_RENTAL_DAYS_MAX = 60;

export function isValidKimonoId(v: string): boolean {
  const id = v.trim();
  return id.length > 0 && id.length <= KIMONO_ID_MAX && KIMONO_ID_PATTERN.test(id);
}

/**
 * 「S, M, L」「S・M・L」「S M L」などをまとめて配列にする。
 * 区切りはカンマ（半角/全角）・読点・中黒・空白。空要素と重複は落とし、順序は保つ。
 */
export function parseList(v: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (v ?? "").split(/[,、，・\s]+/)) {
    const item = raw.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** 配列をフォームに戻すときの表示（カンマ区切り） */
export function formatList(items: string[]): string {
  return items.join(", ");
}

/** フォームの文字列を正の整数へ。不正なら null */
export function parsePositiveInt(v: string | number): number | null {
  if (typeof v === "number") {
    return Number.isInteger(v) && v > 0 ? v : null;
  }
  const trimmed = (v ?? "").trim().replace(/,/g, "");
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * 入力を検証する。
 * `mode: "create"` のときだけ識別子を検証する（変更時は識別子を変えられない仕様。
 * 商品URL `/kimono/<id>` と、予約明細 `ReservationItem.kimonoId` が壊れるため）。
 *
 * カテゴリの存在確認は非同期なのでここでは行わない。サーバーアクション側で行う。
 */
export function validateKimono(
  input: KimonoInput,
  mode: "create" | "update" = "create",
): KimonoErrors {
  const errors: KimonoErrors = {};

  if (mode === "create") {
    const id = input.id?.trim() ?? "";
    if (!id) {
      errors.id = "識別子を入力してください。";
    } else if (id.length > KIMONO_ID_MAX) {
      errors.id = `識別子は${KIMONO_ID_MAX}文字以内で入力してください。`;
    } else if (!KIMONO_ID_PATTERN.test(id)) {
      errors.id = "識別子は半角の小文字・数字・ハイフンのみ使えます。";
    }
  }

  const name = input.name?.trim() ?? "";
  if (!name) {
    errors.name = "商品名を入力してください。";
  } else if (name.length > KIMONO_NAME_MAX) {
    errors.name = `商品名は${KIMONO_NAME_MAX}文字以内で入力してください。`;
  }

  if (!input.category?.trim()) {
    errors.category = "カテゴリを選択してください。";
  }

  const price = parsePositiveInt(input.price);
  if (price === null) {
    errors.price = "レンタル料は1以上の整数で入力してください。";
  } else if (price > KIMONO_PRICE_MAX) {
    errors.price = `レンタル料は${KIMONO_PRICE_MAX.toLocaleString()}円以下で入力してください。`;
  }

  const rentalDays = parsePositiveInt(input.rentalDays);
  if (rentalDays === null) {
    errors.rentalDays = "レンタル日数は1以上の整数で入力してください。";
  } else if (rentalDays > KIMONO_RENTAL_DAYS_MAX) {
    errors.rentalDays = `レンタル日数は${KIMONO_RENTAL_DAYS_MAX}日以内で入力してください。`;
  }

  if (parseList(input.sizes).length === 0) {
    errors.sizes = "サイズを1つ以上入力してください（例: S, M, L）。";
  }
  if (parseList(input.colors).length === 0) {
    errors.colors = "色を1つ以上入力してください（例: 赤, 金）。";
  }
  // 画像は現状プレースホルダのシード文字列。無いとカードが空になるので必須にする
  if (parseList(input.images).length === 0) {
    errors.images = "画像の識別子を1つ以上入力してください。";
  }

  const material = input.material?.trim() ?? "";
  if (!material) {
    errors.material = "素材を入力してください。";
  } else if (material.length > KIMONO_MATERIAL_MAX) {
    errors.material = `素材は${KIMONO_MATERIAL_MAX}文字以内で入力してください。`;
  }

  const description = input.description?.trim() ?? "";
  if (!description) {
    errors.description = "商品説明を入力してください。";
  } else if (description.length > KIMONO_DESCRIPTION_MAX) {
    errors.description = `商品説明は${KIMONO_DESCRIPTION_MAX}文字以内で入力してください。`;
  }

  return errors;
}

export function hasKimonoErrors(errors: KimonoErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** フィールド単位で表示できない場所向けに、最初のエラーを1つ返す（入力欄の並び順） */
export function firstKimonoError(errors: KimonoErrors): string | undefined {
  const order: KimonoField[] = [
    "id",
    "name",
    "category",
    "price",
    "rentalDays",
    "sizes",
    "colors",
    "images",
    "material",
    "description",
  ];
  for (const field of order) {
    if (errors[field]) return errors[field];
  }
  return undefined;
}
