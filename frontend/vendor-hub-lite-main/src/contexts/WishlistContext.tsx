import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { API_BASE } from "@/lib/api";

export type WishlistProduct = Record<string, unknown> & { _id: string };

type WishlistContextType = {
  products: WishlistProduct[];
  loading: boolean;
  refresh: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggle: (productId: string, opts?: { action?: "add" | "remove" }) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role !== "customer") {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wishlist/${user.id}/`);
      if (!res.ok) {
        setProducts([]);
        return;
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ids = useMemo(
    () => new Set(products.map((p) => p._id)),
    [products]
  );

  const isInWishlist = useCallback(
    (productId: string) => ids.has(productId),
    [ids]
  );

  const toggle = useCallback(
    async (
      productId: string,
      opts?: { action?: "add" | "remove" }
    ): Promise<boolean> => {
      if (!user || user.role !== "customer") return false;
      const action =
        opts?.action ?? (ids.has(productId) ? "remove" : "add");
      try {
        const res = await fetch(`${API_BASE}/wishlist/toggle/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: user.id,
            product_id: productId,
            action,
          }),
        });
        if (!res.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [user, ids, refresh]
  );

  return (
    <WishlistContext.Provider
      value={{
        products,
        loading,
        refresh,
        isInWishlist,
        toggle,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
