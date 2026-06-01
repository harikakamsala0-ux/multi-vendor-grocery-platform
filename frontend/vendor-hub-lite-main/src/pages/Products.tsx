import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackBehaviorEvent } from "@/lib/behavior";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Package, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";
import { API_BASE } from "@/lib/api";
import { ImageSearchUpload } from "@/components/ImageSearchUpload";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  vendor_name: string;
  vendor_id?: string;
  stock?: number;
}

type VendorSummary = { average_rating: number | null; count: number };

const SORT_OPTIONS = [
  "default",
  "price_asc",
  "price_desc",
  "rating_desc",
  "rating_asc",
] as const;

const Products = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const searchQuery = (searchParams.get("search") ?? "").trim();
  const rawSort = searchParams.get("sort") ?? "default";
  const sortParam = SORT_OPTIONS.includes(
    rawSort as (typeof SORT_OPTIONS)[number]
  )
    ? rawSort
    : "default";
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorRatings, setVendorRatings] = useState<Record<string, VendorSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/products/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then(async (data: Product[]) => {
        setProducts(data);
        const ids = [...new Set(data.map((p) => p.vendor_id).filter(Boolean))] as string[];
        if (ids.length === 0) {
          setVendorRatings({});
          setLoading(false);
          return;
        }
        try {
          const sumRes = await fetch(`${API_BASE}/reviews/summaries/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendor_ids: ids }),
          });
          if (sumRes.ok) {
            setVendorRatings(await sumRes.json());
          }
        } catch {
          /* non-fatal */
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to fetch products");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user?.role !== "customer") return;
    if (categoryFilter) {
      trackBehaviorEvent(user.id, "category_filter", { category: categoryFilter });
    }
  }, [user?.id, user?.role, categoryFilter]);

  useEffect(() => {
    if (user?.role !== "customer" || !searchQuery) return;
    trackBehaviorEvent(user.id, "product_search", { query: searchQuery });
  }, [user?.id, user?.role, searchQuery]);

  useEffect(() => {
    if (user?.role !== "customer" || products.length === 0) return;
    const top = products.slice(0, 12);
    top.forEach((p) => {
      if (p.vendor_id) {
        trackBehaviorEvent(user.id, "product_impression", {
          product_id: p._id,
          category: p.category,
          vendor_id: p.vendor_id,
        });
      }
    });
  }, [user?.id, user?.role, products]);

  const categoryFiltered = useMemo(
    () =>
      categoryFilter
        ? products.filter((p) => p.category === categoryFilter)
        : products,
    [products, categoryFilter]
  );

  const searchFiltered = useMemo(() => {
    if (!searchQuery) return categoryFiltered;
    const q = searchQuery.toLowerCase();
    return categoryFiltered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [categoryFiltered, searchQuery]);

  const filteredProducts = useMemo(() => {
    const list = [...searchFiltered];
    if (sortParam === "price_asc") {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortParam === "price_desc") {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortParam === "rating_desc" || sortParam === "rating_asc") {
      const score = (p: Product) => {
        const vid = p.vendor_id;
        if (!vid) return null;
        const v = vendorRatings[vid]?.average_rating;
        return v ?? null;
      };
      list.sort((a, b) => {
        const ra = score(a);
        const rb = score(b);
        if (sortParam === "rating_desc") {
          if (ra == null && rb == null) return 0;
          if (ra == null) return 1;
          if (rb == null) return -1;
          return rb - ra;
        }
        if (ra == null && rb == null) return 0;
        if (ra == null) return 1;
        if (rb == null) return -1;
        return ra - rb;
      });
    }
    return list;
  }, [searchFiltered, sortParam, vendorRatings]);

  const setSort = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "default") next.delete("sort");
        else next.set("sort", value);
        return next;
      },
      { replace: true }
    );
  };

  const clearSearchHref = categoryFilter
    ? `/products?category=${encodeURIComponent(categoryFilter)}`
    : "/products";

  if (loading)
    return <p className="text-center text-gray-500 p-8">Loading products...</p>;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {user?.role === "customer" ? (
          <div className="mb-10">
            <RecommendationsSection userId={user.id} title="Picked for you" limit={6} />
          </div>
        ) : null}

        <ImageSearchUpload />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {searchQuery
                ? `Search: “${searchQuery}”`
                : categoryFilter
                  ? categoryFilter
                  : "All Products"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {searchQuery
                ? `Found ${filteredProducts.length} product${
                    filteredProducts.length === 1 ? "" : "s"
                  } matching your search.`
                : categoryFilter
                  ? `Showing products in category: ${categoryFilter}`
                  : "Browse all available products"}
            </p>
            {searchQuery ? (
              <Button variant="link" className="mt-1 h-auto p-0" asChild>
                <Link to={clearSearchHref}>Clear search</Link>
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:w-56">
            <Label htmlFor="product-sort" className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <Select value={sortParam} onValueChange={setSort}>
              <SelectTrigger id="product-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price_asc">Price: Low to high</SelectItem>
                <SelectItem value="price_desc">Price: High to low</SelectItem>
                <SelectItem value="rating_desc">Reviews: Highest rated vendors</SelectItem>
                <SelectItem value="rating_asc">Reviews: Lowest rated vendors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const vid = product.vendor_id;
              const vr = vid ? vendorRatings[vid] : undefined;
              return (
                <Card
                  key={product._id}
                  className="shadow-card hover:shadow-card-hover transition-base overflow-hidden group"
                >
                  <div className="aspect-square overflow-hidden">
                  <img
                    src={resolveProductImageUrl(product)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-base bg-muted"
                    onError={handleProductImageError}
                    loading="lazy"
                  />
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{product.name}</CardTitle>
                      <Badge variant="secondary">₹{product.price}</Badge>
                    </div>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 text-sm">
                      <span className="text-muted-foreground">By {product.vendor_name}</span>
                      {vr && vr.count > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  vr.average_rating != null && n <= Math.round(vr.average_rating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/25"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {vr.average_rating} ({vr.count})
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <span />
                        <Badge variant="outline">
                          <Package className="h-3 w-3 mr-1" />
                          {product.stock ?? 1} in stock
                        </Badge>
                      </div>
                    </div>
                    <Link to={`/product/${product._id}`}>
                      <Button className="w-full" variant="default">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try a different name or clear the search to see more products."
                : "Vendors haven’t added any products yet. Check back later!"}
            </p>
            {searchQuery ? (
              <Button variant="outline" className="mt-4" asChild>
                <Link to={clearSearchHref}>Clear search</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
