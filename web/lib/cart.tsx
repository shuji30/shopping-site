"use client";

// クライアント側のカート状態。MVP段階ではバックエンドを持たないため、
// React Context + localStorage で永続化する。将来サーバー/認証と連携する際は
// この Provider の内部実装を差し替える（利用側の useCart インターフェースは維持）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** カートの1明細（＝1点のレンタル予約） */
export interface CartItem {
  /** 明細の一意キー（同一商品でもサイズ・開始日が違えば別明細） */
  id: string;
  kimonoId: string;
  name: string;
  size: string;
  /** レンタル開始日（YYYY-MM-DD） */
  startDate: string;
  /** レンタル日数 */
  rentalDays: number;
  /** レンタル料金（円） */
  price: number;
  /** プレースホルダ画像用シード */
  imageSeed: string;
}

/** 明細キーを生成 */
export function makeCartItemId(
  kimonoId: string,
  size: string,
  startDate: string,
): string {
  return `${kimonoId}__${size}__${startDate}`;
}

interface CartContextValue {
  items: CartItem[];
  /** 準備完了（localStorage 読み込み済み）か */
  ready: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  count: number;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "miyabi-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // 初回マウント時に localStorage から復元する。
  // SSR とのハイドレーション不整合を避けるため、初期値は空にして
  // クライアントのマウント後に一度だけ読み込む（依存配列は空でループしない）。
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 永続状態の初回読み込み（マウント時一回のみ）
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // 壊れたデータは無視して空カートで開始
    }
    setReady(true);
  }, []);

  // 変更を localStorage へ保存（復元完了後のみ）
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // 保存失敗は無視（プライベートモード等）
    }
  }, [items, ready]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev : [...prev, item],
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      addItem,
      removeItem,
      clear,
      count: items.length,
      total: items.reduce((sum, i) => sum + i.price, 0),
    }),
    [items, ready, addItem, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart は CartProvider の内側で使用してください");
  }
  return ctx;
}
