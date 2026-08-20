"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/admin-category";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_ID_MAX,
  CATEGORY_LABEL_MAX,
} from "@/lib/category-validation";
import type { KimonoCategory } from "@/lib/types";

/** カテゴリ1件と、そこに属する商品数（削除可否の判断に使う） */
export interface CategoryWithCount extends KimonoCategory {
  kimonoCount: number;
}

interface FormValues {
  id: string;
  label: string;
  description: string;
  sortOrder: string;
}

const fieldClass =
  "mt-1 block w-full rounded-md border border-kin/40 bg-white/70 px-3 py-2 text-sm text-sumi focus:border-kon focus:outline-none";

/** 管理画面：商品カテゴリマスタの登録・変更・削除 */
export function CategoryManager({
  categories,
  nextOrder,
}: {
  categories: CategoryWithCount[];
  /** 新規登録時の表示順の既定値（末尾に来る値） */
  nextOrder: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  /** 編集中の行のID。null なら編集していない */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emptyNew: FormValues = {
    id: "",
    label: "",
    description: "",
    sortOrder: String(nextOrder),
  };
  const [newValues, setNewValues] = useState<FormValues>(emptyNew);
  const [editValues, setEditValues] = useState<FormValues>(emptyNew);

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess: () => void,
    successMessage: string,
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "処理に失敗しました。");
        return;
      }
      onSuccess();
      setNotice(successMessage);
      router.refresh();
    });
  }

  function startEdit(c: CategoryWithCount) {
    setError(null);
    setNotice(null);
    setEditingId(c.id);
    setEditValues({
      id: c.id,
      label: c.label,
      description: c.description,
      sortOrder: String(c.sortOrder),
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md bg-enji/10 px-4 py-3 text-sm text-enji">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {/* 一覧 */}
      <div className="overflow-x-auto rounded-lg border border-kin/20 bg-white/60">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-kin/30 text-left text-sumi/60">
              <th className="px-4 py-3 font-medium">表示順</th>
              <th className="px-4 py-3 font-medium">識別子</th>
              <th className="px-4 py-3 font-medium">表示名</th>
              <th className="px-4 py-3 font-medium">説明</th>
              <th className="px-4 py-3 font-medium">商品数</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sumi/60">
                  カテゴリがありません。下のフォームから登録してください。
                </td>
              </tr>
            )}
            {categories.map((c) =>
              editingId === c.id ? (
                <tr key={c.id} className="border-b border-kin/15 bg-washi-dark/30">
                  <td className="px-4 py-3 align-top">
                    <input
                      aria-label="表示順"
                      value={editValues.sortOrder}
                      onChange={(e) =>
                        setEditValues({ ...editValues, sortOrder: e.target.value })
                      }
                      className={`${fieldClass} w-20`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-sumi/60">
                    {c.id}
                    <p className="mt-1 font-sans text-xs text-sumi/50">
                      識別子は変更できません
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      aria-label="表示名"
                      value={editValues.label}
                      maxLength={CATEGORY_LABEL_MAX}
                      onChange={(e) =>
                        setEditValues({ ...editValues, label: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      aria-label="説明"
                      value={editValues.description}
                      maxLength={CATEGORY_DESCRIPTION_MAX}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          description: e.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">{c.kimonoCount}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              updateCategory(c.id, {
                                label: editValues.label,
                                description: editValues.description,
                                sortOrder: editValues.sortOrder,
                              }),
                            () => setEditingId(null),
                            `「${editValues.label}」を更新しました。`,
                          )
                        }
                        className="rounded-md bg-kon px-3 py-1.5 text-xs text-washi transition hover:bg-kon-light disabled:opacity-50"
                      >
                        保存する
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-kin/40 px-3 py-1.5 text-xs text-sumi/80 transition hover:border-kin"
                      >
                        やめる
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={c.id}
                  className="border-b border-kin/15 last:border-0 hover:bg-washi-dark/30"
                >
                  <td className="px-4 py-3 text-sumi/70">{c.sortOrder}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">{c.label}</td>
                  <td className="px-4 py-3 text-sumi/70">{c.description}</td>
                  <td className="px-4 py-3">{c.kimonoCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(c)}
                        className="rounded-md border border-kin/40 px-3 py-1.5 text-xs text-sumi/80 transition hover:border-kin disabled:opacity-50"
                      >
                        編集する
                      </button>
                      <button
                        type="button"
                        disabled={pending || c.kimonoCount > 0}
                        title={
                          c.kimonoCount > 0
                            ? "商品が紐づいているため削除できません"
                            : undefined
                        }
                        onClick={() => {
                          if (
                            !window.confirm(
                              `カテゴリ「${c.label}」を削除します。よろしいですか？`,
                            )
                          ) {
                            return;
                          }
                          run(
                            () => deleteCategory(c.id),
                            () => setEditingId(null),
                            `「${c.label}」を削除しました。`,
                          );
                        }}
                        className="rounded-md border border-enji/40 px-3 py-1.5 text-xs text-enji transition hover:border-enji disabled:opacity-30"
                      >
                        削除する
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* 新規登録 */}
      <section className="rounded-lg border border-kin/20 bg-white/60 p-6">
        <h2 className="font-serif text-lg text-kon">カテゴリを追加</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-id"
              className="text-sm font-medium text-sumi/80"
            >
              識別子 <span className="text-enji">*</span>
            </label>
            <input
              id="new-id"
              value={newValues.id}
              maxLength={CATEGORY_ID_MAX}
              placeholder="komon"
              onChange={(e) =>
                setNewValues({ ...newValues, id: e.target.value })
              }
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-sumi/50">
              半角の小文字・数字・ハイフン。URL（?category=…）に使われ、
              登録後は変更できません。
            </p>
          </div>
          <div>
            <label
              htmlFor="new-label"
              className="text-sm font-medium text-sumi/80"
            >
              表示名 <span className="text-enji">*</span>
            </label>
            <input
              id="new-label"
              value={newValues.label}
              maxLength={CATEGORY_LABEL_MAX}
              placeholder="小紋"
              onChange={(e) =>
                setNewValues({ ...newValues, label: e.target.value })
              }
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="new-description"
              className="text-sm font-medium text-sumi/80"
            >
              説明 <span className="text-enji">*</span>
            </label>
            <input
              id="new-description"
              value={newValues.description}
              maxLength={CATEGORY_DESCRIPTION_MAX}
              placeholder="普段着として気軽に楽しめる、繰り返し柄の着物。"
              onChange={(e) =>
                setNewValues({ ...newValues, description: e.target.value })
              }
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-sort-order"
              className="text-sm font-medium text-sumi/80"
            >
              表示順
            </label>
            <input
              id="new-sort-order"
              value={newValues.sortOrder}
              onChange={(e) =>
                setNewValues({ ...newValues, sortOrder: e.target.value })
              }
              className={`${fieldClass} w-32`}
            />
            <p className="mt-1 text-xs text-sumi/50">
              小さいほど先に表示されます（10刻みが目安）。
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => createCategory(newValues),
              () => setNewValues({ ...emptyNew, sortOrder: String(nextOrder + 10) }),
              `「${newValues.label}」を追加しました。`,
            )
          }
          className="mt-5 rounded-full bg-kin px-8 py-2.5 text-sm font-medium text-sumi transition hover:bg-kin/90 disabled:opacity-50"
        >
          追加する
        </button>
      </section>

      {pending && <p className="text-xs text-sumi/50">処理中...</p>}
    </div>
  );
}
