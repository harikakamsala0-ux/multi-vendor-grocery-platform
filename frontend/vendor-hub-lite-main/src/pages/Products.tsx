import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  vendor_name: string;
  stock?: number;
}

const Products = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/products/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to fetch products");
        setLoading(false);
      });
  }, []);

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.category === categoryFilter)
    : products;

  if (loading)
    return <p className="text-center text-gray-500 p-8">Loading products...</p>;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {categoryFilter ? categoryFilter : "All Products"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {categoryFilter
              ? `Showing products in category: ${categoryFilter}`
              : "Browse all available products"}
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product._id}
                className="shadow-card hover:shadow-card-hover transition-base overflow-hidden group"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.image || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-base"
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      By {product.vendor_name}
                    </span>
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {product.stock ?? 1} in stock
                    </Badge>
                  </div>
                  <Link to={`/product/${product._id}`}>
                    <Button className="w-full" variant="default">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              Vendors haven’t added any products yet. Check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
