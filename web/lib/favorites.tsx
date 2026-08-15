"use client";

// お気に入り（ウィッシュリスト）のクライアント状態。カートと同様、MVP段階では
// バックエンドを持たないため React Context + localStorage で永続化する。
// 保存するのは着物ID（string）の配列のみ。表示に必要な商品データはページ側で
// DB から取得して突き合わせる。将来サーバー/認証と連携する際は、この Provider の
// 内部実装だけを差し替える（useFavorites のインターフェースは維持）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface FavoritesContextValue {
  ids: string[];
  /** 準備完了（localStorage 読み込み済み）か */
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "miyabi-favorites";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // 初回マウント時に localStorage から復元（マウント時一回のみ）。
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 永続状態の初回読み込み（マウント時一回のみ）
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      // 壊れたデータは無視して空で開始
    }
    setReady(true);
  }, []);

  // 変更を localStorage へ保存（復元完了後のみ）
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // 保存失敗は無視（プライベートモード等）
    }
  }, [ids, ready]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ids,
      ready,
      has,
      toggle,
      remove,
      clear,
      count: ids.length,
    }),
    [ids, ready, has, toggle, remove, clear],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error(
      "useFavorites は FavoritesProvider の内側で使用してください",
    );
  }
  return ctx;
}
