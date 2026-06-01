import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Sparkles } from "lucide-react";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";

const API = "http://127.0.0.1:8000/api";

export interface RecommendedProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  vendor_name?: string;
  stock?: number;
  recommendation_score?: number;
  match_reasons?: string[];
}

interface Props {
  userId: string;
  title?: string;
  limit?: number;
  className?: string;
}

const reasonLabels: Record<string, string> = {
  category_match: "Your categories",
  vendor_affinity: "Vendors you like",
  similar_shoppers: "Similar shoppers",
  browsing_patterns: "Browsing match",
  popular: "Trending",
  explore: "Discover",
};

export function RecommendationsSection({
  userId,
  title = "Recommended for you",
  limit = 8,
  className = "",
}: Props) {
  const [items, setItems] = useState<RecommendedProduct[]>([]);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/recommendations/${userId}/?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.products || []);
        setStrategy(data.strategy || null);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  if (loading) {
    return (
      <section className={`py-10 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={`py-10 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              {title}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {strategy === "popular_fallback"
                ? "Popular picks while we learn your preferences"
                : "Based on your orders, browsing, and what similar shoppers choose"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((product) => (
            <Card
              key={product._id}
              className="shadow-card hover:shadow-card-hover transition-base overflow-hidden group"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={resolveProductImageUrl(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-base bg-muted"
                  onError={handleProductImageError}
                  loading="lazy"
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                  <Badge variant="secondary">₹{product.price}</Badge>
                </div>
                {product.match_reasons && product.match_reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {product.match_reasons.slice(0, 2).map((r) => (
                      <Badge key={r} variant="outline" className="text-xs font-normal">
                        {reasonLabels[r] || r}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <CardDescription className="line-clamp-2">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>By {product.vendor_name}</span>
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {product.stock ?? 0} in stock
                  </Badge>
                </div>
                <Link to={`/product/${product._id}`}>
                  <Button className="w-full" variant="default" size="sm">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
