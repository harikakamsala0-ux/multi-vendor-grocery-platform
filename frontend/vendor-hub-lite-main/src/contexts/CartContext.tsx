import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type CartLine = {
  product_id: string;
  quantity: number;
};

const STORAGE_KEY = "freshcart_cart_v1";

type CartContextType = {
  items: CartLine[];
  itemCount: number;
  addToCart: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  removeLines: (productIds: string[]) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadInitial(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x: unknown) =>
        x &&
        typeof x === "object" &&
        "product_id" in x &&
        typeof (x as CartLine).product_id === "string" &&
        typeof (x as CartLine).quantity === "number"
    );
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartLine[]>(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((productId: string, quantity = 1) => {
    const q = Math.max(1, quantity);
    setItems((prev) => {
      const idx = prev.findIndex((l) => l.product_id === productId);
      if (idx === -1) return [...prev, { product_id: productId, quantity: q }];
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity + q,
      };
      return next;
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const q = Math.max(1, quantity);
    setItems((prev) => {
      const idx = prev.findIndex((l) => l.product_id === productId);
      if (idx === -1) return [...prev, { product_id: productId, quantity: q }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: q };
      return next;
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setItems((prev) => prev.filter((l) => l.product_id !== productId));
  }, []);

  const removeLines = useCallback((productIds: string[]) => {
    const drop = new Set(productIds);
    setItems((prev) => prev.filter((l) => !drop.has(l.product_id)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((s, l) => s + l.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        addToCart,
        setQuantity,
        removeLine,
        removeLines,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
