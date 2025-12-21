import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/products/");
        const data = await res.json();
        const found = data.find((item: any) => item._id === id);
        setProduct(found);
      } catch {
        toast.error("Failed to load product details");
      }
    };
    fetchProduct();
  }, [id]);

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

    const payload = {
      customer_id: user.id, // Must be MongoDB _id string from backend
      product_id: product._id,
      quantity: quantity || 1,
    };

    console.log("Placing order payload:", payload);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/place_order/", {
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

  if (!product)
    return <p className="p-8 text-center text-gray-600">Loading product...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-8">
        <img
          src={product.image}
          alt={product.name}
          className="w-80 h-80 object-cover rounded-lg shadow"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <p className="text-lg font-semibold mb-2">₹{product.price}</p>
          <p className="text-sm text-gray-500 mb-4">
            Vendor: {product.vendor_name}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label>Quantity:</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              min="1"
              max={product.stock}
              className="border px-2 py-1 rounded w-20"
            />
          </div>

          <Button onClick={handlePlaceOrder} disabled={loading}>
            {loading ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
