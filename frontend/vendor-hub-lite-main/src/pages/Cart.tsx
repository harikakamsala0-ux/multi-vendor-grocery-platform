import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, CreditCard } from "lucide-react";

type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  vendor_name?: string;
  vendor_email?: string;
  vendor_id?: string;
  image?: string;
};

type PayStep = "cart" | "review" | "success";

const Cart = () => {
  const { user } = useAuth();
  const { items, setQuantity, removeLine, removeLines } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [step, setStep] = useState<PayStep>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  /** Product IDs the user chose to pay for (used for checkout + removal). */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_BASE}/products/`)
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Could not load products"));
  }, []);

  const cartIdSet = useMemo(
    () => new Set(items.map((l) => l.product_id)),
    [items]
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of cartIdSet) {
        if (prev.has(id)) next.add(id);
        else next.add(id);
      }
      return next;
    });
  }, [cartIdSet]);

  const toggleSelected = useCallback((productId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((l) => l.product_id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p._id, p);
    return m;
  }, [products]);

  const lines = useMemo(() => {
    return items.map((line) => ({
      ...line,
      product: byId.get(line.product_id),
    }));
  }, [items, byId]);

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedIds.has(l.product_id)),
    [lines, selectedIds]
  );

  const subtotalAll = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      if (!l.product) continue;
      t += Number(l.product.price) * l.quantity;
    }
    return t;
  }, [lines]);

  const subtotalSelected = useMemo(() => {
    let t = 0;
    for (const l of selectedLines) {
      if (!l.product) continue;
      t += Number(l.product.price) * l.quantity;
    }
    return t;
  }, [selectedLines]);

  const payloadItems = useMemo(
    () =>
      selectedLines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
      })),
    [selectedLines]
  );

  const handleProceedToPay = () => {
    if (!user || user.role !== "customer") {
      toast.error("Please sign in as a customer to pay.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one item to pay for.");
      return;
    }
    setStep("review");
  };

  const handlePayNow = async () => {
    if (!user || user.role !== "customer") {
      toast.error("Please sign in as a customer to pay.");
      return;
    }
    if (payloadItems.length === 0) {
      toast.error("No items selected to pay for.");
      return;
    }
    const paidProductIds = [...selectedIds];
    const totalForThisPayment = subtotalSelected;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: user.id,
          items: payloadItems,
          payment_method: "mock",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Payment failed");
        if (Array.isArray(data.details)) {
          data.details.forEach((d: { error?: string }) =>
            toast.message(d.error ?? "")
          );
        }
        return;
      }
      if (data.failed?.length) {
        toast.message("Some items could not be ordered.");
      }
      setPaidTotal(totalForThisPayment);
      removeLines(paidProductIds);
      setStep("success");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your payment was successful</h1>
        <p className="text-muted-foreground mb-2">
          Thank you. A total of{" "}
          <span className="font-semibold text-foreground">
            ₹{(paidTotal ?? 0).toFixed(2)}
          </span>{" "}
          was processed for the items you selected (demo). Vendors have been
          notified. Other cart items were not charged.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/customer/dashboard">View my orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cart">Back to cart</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && step === "cart") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Add items from product pages to continue.
        </p>
        <Button asChild>
          <Link to="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Cart</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Select the items you want to pay for, then click{" "}
        <span className="font-medium text-foreground">Proceed to pay</span>.
        Only checked lines are included in checkout.
      </p>

      {step === "cart" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            Select all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
            Deselect all
          </Button>
        </div>
      ) : null}

      {step === "cart" ? (
        <ul className="space-y-4">
          {lines.map(({ product_id, quantity, product }) => {
            const checked = selectedIds.has(product_id);
            return (
              <li
                key={product_id}
                className="flex gap-3 rounded-lg border bg-card p-4 sm:gap-4"
              >
                <div className="flex shrink-0 items-start pt-1">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      toggleSelected(product_id, v === true)
                    }
                    aria-label={`Select ${product?.name ?? "item"} for checkout`}
                  />
                </div>
                {product ? (
                  <img
                    src={resolveProductImageUrl(
                      product as Record<string, unknown>
                    )}
                    alt={product.name}
                    className="h-24 w-24 shrink-0 rounded-md object-cover bg-muted"
                    onError={handleProductImageError}
                  />
                ) : (
                  <div className="h-24 w-24 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {product ? (
                      <Link
                        to={`/product/${product_id}`}
                        className="hover:text-primary"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        Unknown product
                      </span>
                    )}
                  </p>
                  {product?.vendor_name ? (
                    <p className="text-sm text-muted-foreground">
                      {product.vendor_name}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-muted-foreground">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={product?.stock ?? 9999}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) return;
                        const cap = product?.stock ?? v;
                        setQuantity(
                          product_id,
                          Math.min(Math.max(1, v), cap)
                        );
                      }}
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeLine(product_id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {product ? (
                    <p className="font-semibold">
                      ₹{(Number(product.price) * quantity).toFixed(2)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-6">
        <div>
          <p className="text-lg">
            Selected subtotal:{" "}
            <span className="font-bold">₹{subtotalSelected.toFixed(2)}</span>
          </p>
          {selectedIds.size < lines.length ? (
            <p className="text-sm text-muted-foreground">
              Cart total (all items): ₹{subtotalAll.toFixed(2)}
            </p>
          ) : null}
        </div>
        {step === "cart" ? (
          <Button
            size="lg"
            type="button"
            onClick={handleProceedToPay}
            disabled={selectedIds.size === 0}
          >
            Proceed to pay
          </Button>
        ) : null}
      </div>

      {step === "review" ? (
        <div className="mt-10 space-y-6 rounded-xl border bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <CreditCard className="h-6 w-6 shrink-0 text-primary mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">Payment details</h2>
              <p className="text-sm text-muted-foreground">
                You are paying only for the {selectedLines.length} selected line
                {selectedLines.length === 1 ? "" : "s"}. Demo checkout — no real
                card or UPI is charged.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-1 text-sm">
            <p className="font-medium text-foreground">Mock payment method</p>
            <p className="text-muted-foreground">
              Card ending •••• 4242 · UPI demo@freshcart · Status: ready
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Order summary — selected items only
            </h3>
            <ul className="space-y-4">
              {selectedLines.map(({ product_id, quantity, product }) => (
                <li
                  key={product_id}
                  className="rounded-lg border bg-background p-4 text-sm"
                >
                  <div className="flex justify-between gap-4 font-medium">
                    <span>{product?.name ?? "Product"}</span>
                    <span>
                      ₹
                      {product
                        ? (Number(product.price) * quantity).toFixed(2)
                        : "—"}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">Qty: {quantity}</p>
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
                    <p>
                      <span className="text-muted-foreground">Vendor: </span>
                      {product?.vendor_name ?? "—"}
                    </p>
                    {product?.vendor_email ? (
                      <p>
                        <span className="text-muted-foreground">
                          Vendor email:{" "}
                        </span>
                        {product.vendor_email}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-2">
            <p className="text-lg font-semibold">
              Total payable: ₹{subtotalSelected.toFixed(2)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("cart")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={submitting}
                onClick={() => void handlePayNow()}
              >
                {submitting ? "Processing…" : "Pay now"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Cart;
