import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackBehaviorEvent } from "@/lib/behavior";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";
import { API_BASE } from "@/lib/api";

const API = API_BASE;

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendorReviews, setVendorReviews] = useState<{
    average_rating: number | null;
    count: number;
    reviews: Array<{
      _id: string;
      customer_name: string;
      rating: number;
      comment: string;
      sentiment_label?: string;
      fraud_risk?: string;
    }>;
  } | null>(null);
  const [reviewInsights, setReviewInsights] = useState<{
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
    summary: string;
    review_count: number;
  } | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API}/products/`);
        const data = await res.json();
        const found = data.find((item: any) => item._id === id);
        setProduct(found);
      } catch {
        toast.error("Failed to load product details");
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product?.vendor_id) {
      setVendorReviews(null);
      setReviewInsights(null);
      return;
    }
    fetch(`${API}/reviews/vendor/${product.vendor_id}/`)
      .then((res) => res.json())
      .then(setVendorReviews)
      .catch(() => setVendorReviews(null));
    fetch(`${API}/reviews/vendor/${product.vendor_id}/insights/`)
      .then((res) => res.json())
      .then((d) => {
        if (d.summary) setReviewInsights(d);
        else setReviewInsights(null);
      })
      .catch(() => setReviewInsights(null));
  }, [product?.vendor_id]);

  useEffect(() => {
    if (!product?._id || user?.role !== "customer") return;
    trackBehaviorEvent(user.id, "product_view", {
      product_id: product._id,
      category: product.category,
      vendor_id: product.vendor_id,
    });
  }, [product?._id, product?.category, product?.vendor_id, user?.id, user?.role]);

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please log in to place an order.");
      return;
    }

    if (user.role !== "customer") {
      toast.error("Only customers can place orders.");
      return;
    }

    if (!product) {
      toast.error("Product not found.");
      return;
    }

    setLoading(true);

    trackBehaviorEvent(user.id, "order_intent", {
      product_id: product._id,
      category: product.category,
      vendor_id: product.vendor_id,
    });

    const payload = {
      customer_id: user.id, // Must be MongoDB _id string from backend
      product_id: product._id,
      quantity: quantity || 1,
    };

    console.log("Placing order payload:", payload);

    try {
      const res = await fetch(`${API}/place_order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message || "Order placed successfully!");
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch (err) {
      toast.error("Network error while placing order");
      console.error("Order error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product._id, quantity || 1);
    if (user?.role === "customer") {
      trackBehaviorEvent(user.id, "add_to_cart", {
        product_id: product._id,
        category: product.category,
        vendor_id: product.vendor_id,
      });
    }
    toast.success("Added to cart");
  };

  const handleWishlist = async () => {
    if (!user || user.role !== "customer") {
      toast.error("Sign in as a customer to use the wishlist.");
      return;
    }
    if (!product) return;
    const wasIn = isInWishlist(product._id);
    const ok = await toggleWishlist(product._id);
    if (ok) {
      toast.success(wasIn ? "Removed from wishlist" : "Saved to wishlist");
    } else {
      toast.error("Could not update wishlist");
    }
  };

  if (!product)
    return <p className="p-8 text-center text-gray-600">Loading product...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-8">
        <img
          src={resolveProductImageUrl(product)}
          alt={product.name}
          className="w-80 h-80 object-cover rounded-lg shadow bg-muted"
          onError={handleProductImageError}
          loading="lazy"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <p className="text-lg font-semibold mb-2">₹{product.price}</p>
          <p className="text-sm text-gray-500 mb-1">Vendor: {product.vendor_name}</p>
          {vendorReviews && vendorReviews.count > 0 ? (
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-4 w-4",
                      vendorReviews.average_rating != null &&
                        n <= Math.round(vendorReviews.average_rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/25"
                    )}
                  />
                ))}
              </div>
              <span className="font-medium">{vendorReviews.average_rating}</span>
              <span className="text-muted-foreground">
                ({vendorReviews.count} customer {vendorReviews.count === 1 ? "review" : "reviews"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No customer reviews for this vendor yet.</p>
          )}
          {reviewInsights && reviewInsights.review_count > 0 ? (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                AI review summary
              </p>
              <p className="text-sm text-foreground leading-relaxed">{reviewInsights.summary}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-green-600/15 text-green-800 dark:text-green-300 px-2 py-0.5">
                  Positive {reviewInsights.sentiment_breakdown.positive}
                </span>
                <span className="rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 px-2 py-0.5">
                  Neutral {reviewInsights.sentiment_breakdown.neutral}
                </span>
                <span className="rounded-full bg-red-600/15 text-red-800 dark:text-red-300 px-2 py-0.5">
                  Negative {reviewInsights.sentiment_breakdown.negative}
                </span>
              </div>
            </div>
          ) : null}
          {vendorReviews && vendorReviews.reviews.length > 0 ? (
            <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recent feedback
              </p>
              {vendorReviews.reviews.slice(0, 3).map((r) => (
                <div key={r._id} className="text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="font-medium">{r.customer_name || "Customer"}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.sentiment_label ? (
                        <span
                          className={cn(
                            "text-[10px] uppercase rounded px-1.5 py-0.5",
                            r.sentiment_label === "positive" && "bg-green-600/20 text-green-800",
                            r.sentiment_label === "negative" && "bg-red-600/20 text-red-800",
                            r.sentiment_label === "neutral" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {r.sentiment_label}
                        </span>
                      ) : null}
                      <span className="text-amber-600">{r.rating}/5</span>
                    </div>
                  </div>
                  {r.comment ? <p className="text-muted-foreground mt-1">{r.comment}</p> : null}
                  {r.fraud_risk && r.fraud_risk !== "low" ? (
                    <p className="text-[10px] text-amber-700 mt-1">Flagged for verification ({r.fraud_risk})</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3 mb-4">
            <label>Quantity:</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              min="1"
              max={product.stock}
              className="border px-2 py-1 rounded w-20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="default" onClick={handleAddToCart}>
              Add to cart
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleWishlist()}
              disabled={user?.role !== "customer"}
              title={
                user?.role !== "customer"
                  ? "Customers can save items to a wishlist"
                  : undefined
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4 mr-2",
                  product._id && isInWishlist(product._id)
                    ? "fill-primary text-primary"
                    : ""
                )}
              />
              Wishlist
            </Button>
            <Button onClick={handlePlaceOrder} disabled={loading} variant="secondary">
              {loading ? "Sending..." : "Place order now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
