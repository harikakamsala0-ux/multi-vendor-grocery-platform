import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart } from "lucide-react";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";
import { toast } from "sonner";

const Wishlist = () => {
  const { user } = useAuth();
  const { products, loading, toggle } = useWishlist();
  const { addToCart } = useCart();

  if (!user || user.role !== "customer") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Wishlist</h1>
        <p className="text-muted-foreground mb-6">
          Sign in as a customer to save products to your wishlist.
        </p>
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Loading wishlist…
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">No saved items yet</h1>
        <p className="text-muted-foreground mb-6">
          Tap the heart on a product to save it here.
        </p>
        <Button asChild>
          <Link to="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Wishlist</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Card key={p._id} className="overflow-hidden">
            <Link to={`/product/${p._id}`}>
              <img
                src={resolveProductImageUrl(p)}
                alt={String(p.name ?? "")}
                className="h-44 w-full object-cover bg-muted"
                onError={handleProductImageError}
              />
            </Link>
            <CardContent className="p-4 space-y-3">
              <Link to={`/product/${p._id}`}>
                <h2 className="font-semibold hover:text-primary line-clamp-2">
                  {String(p.name ?? "")}
                </h2>
              </Link>
              <p className="text-lg font-medium">
                ₹{Number(p.price ?? 0).toFixed(2)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ok = await toggle(p._id, { action: "remove" });
                    if (ok) toast.success("Removed from wishlist");
                    else toast.error("Could not update wishlist");
                  }}
                >
                  Remove
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    addToCart(p._id, 1);
                    toast.success("Added to cart");
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add to cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
