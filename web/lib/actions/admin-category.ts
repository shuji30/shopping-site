"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { countKimonosInCategory } from "@/lib/category-repository";
import {
  firstCategoryError,
  hasCategoryErrors,
  parseSortOrder,
  validateCategory,
  type CategoryInput,
} from "@/lib/category-validation";

// 管理画面から商品カテゴリマスタを登録・変更・削除する。
// /admin 配下から呼ばれ、middleware の Basic 認証で保護される。

export interface CategoryActionResult {
  ok: boolean;
  error?: string;
}

/** カテゴリを表示している画面をまとめて再検証する */
function revalidateCategoryViews() {
  revalidatePath("/admin/categories");
  revalidatePath("/kimonos");
  revalidatePath("/"); // トップの「シーンから探す」と注目商品
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryActionResult> {
  const errors = validateCategory(input, "create");
  if (hasCategoryErrors(errors)) {
    return { ok: false, error: firstCategoryError(errors) };
  }

  const id = input.id.trim();
  const existing = await prisma.category.findUnique({ where: { id } });
  if (existing) {
    return { ok: false, error: `識別子「${id}」はすでに使われています。` };
  }

  await prisma.category.create({
    data: {
      id,
      label: input.label.trim(),
      description: input.description.trim(),
      sortOrder: parseSortOrder(input.sortOrder) ?? 0,
    },
  });

  revalidateCategoryViews();
  return { ok: true };
}

/**
 * 表示名・説明・表示順を変更する。
 * **識別子は変更できない**（既存商品の category 列や、共有済みの絞り込みURLが
 * 壊れるため）。付け替えが必要なときは新規作成して商品を移す運用とする。
 */
export async function updateCategory(
  id: string,
  input: Omit<CategoryInput, "id">,
): Promise<CategoryActionResult> {
  const errors = validateCategory({ ...input, id }, "update");
  if (hasCategoryErrors(errors)) {
    return { ok: false, error: firstCategoryError(errors) };
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "カテゴリが見つかりません。" };
  }

  await prisma.category.update({
    where: { id },
    data: {
      label: input.label.trim(),
      description: input.description.trim(),
      sortOrder: parseSortOrder(input.sortOrder) ?? existing.sortOrder,
    },
  });

  revalidateCategoryViews();
  return { ok: true };
}

/**
 * カテゴリを削除する。
 * 商品が1点でも紐づいている場合は拒否する（消すと商品のカテゴリが宙に浮き、
 * 一覧の絞り込みから辿れなくなるため）。先に商品を別カテゴリへ移してもらう。
 */
export async function deleteCategory(
  id: string,
): Promise<CategoryActionResult> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "カテゴリが見つかりません。" };
  }

  const count = await countKimonosInCategory(id);
  if (count > 0) {
    return {
      ok: false,
      error: `このカテゴリには商品が${count}点あります。先に別のカテゴリへ移してください。`,
    };
  }

  await prisma.category.delete({ where: { id } });

  revalidateCategoryViews();
  return { ok: true };
}
