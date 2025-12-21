import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { categoryOptions } from "@/data/categoriesList";

const VendorDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    image: "",
  });

  // Fetch vendor orders
  const fetchOrders = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${user?.id}/`);
      if (res.ok) setOrders(await res.json());
    } catch {
      toast.error("Failed to load orders");
    }
  };

  // Fetch vendor products
  const fetchVendorProducts = async () => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/products/vendor/${user?.id}/`
      );
      if (res.ok) setProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchVendorProducts();
      const interval = setInterval(() => {
        fetchOrders();
        fetchVendorProducts();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const handleInputChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Add product
  const handleAddProduct = async (e: any) => {
    e.preventDefault();

    const payload = { ...form, vendor_id: user?.id };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/add_product/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Product added successfully!");
        setForm({
          name: "",
          description: "",
          price: "",
          stock: "",
          category: "",
          image: "",
        });
        fetchVendorProducts(); // refresh product list
      }
    } catch {
      toast.error("Network error.");
    }
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/update_order_status/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Order ${newStatus}`);
        fetchOrders();
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Group orders
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const approvedOrders = orders.filter((o) => o.status === "approved");
  const rejectedOrders = orders.filter((o) => o.status === "rejected");

  const renderOrderTable = (title: string, data: any[], color: string) => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className={`text-xl font-semibold mb-4 text-${color}-600`}>
        {title} ({data.length})
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-500">No {title.toLowerCase()}.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Product</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Total</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((order) => (
              <tr key={order._id} className="border-b">
                <td>{order.product_name}</td>
                <td>{order.customer_name}</td>
                <td>{order.quantity}</td>
                <td>₹{order.total_price}</td>
                <td>{order.status}</td>
                <td>
                  {order.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 text-white"
                        onClick={() => handleUpdateStatus(order._id, "approved")}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        className="bg-red-600 text-white"
                        onClick={() => handleUpdateStatus(order._id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Vendor Dashboard</h1>

      {/* ADD PRODUCT */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add New Product</h2>

        <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">

          <Input
            name="name"
            placeholder="Product Name"
            value={form.name}
            onChange={handleInputChange}
            required
          />

          <Input
            name="price"
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={handleInputChange}
            required
          />

          <Input
            name="stock"
            type="number"
            placeholder="Stock Quantity"
            value={form.stock}
            onChange={handleInputChange}
            required
          />

          {/* CATEGORY DROPDOWN */}
          <select
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Select Category</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <Input
            name="image"
            placeholder="Image URL"
            value={form.image}
            onChange={handleInputChange}
          />

          <Input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleInputChange}
          />

          <Button type="submit" className="col-span-2 mt-2">
            Add Product
          </Button>
        </form>
      </div>

      {/* SHOW ADDED PRODUCTS */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">My Products ({products.length})</h2>

        {products.length === 0 ? (
          <p className="text-gray-500">No products added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div key={p._id} className="border rounded-lg p-4 shadow-sm">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-gray-600 text-sm mb-1">Category: {p.category}</p>
                <p className="text-gray-600 text-sm mb-1">Price: ₹{p.price}</p>
                <p className="text-gray-600 text-sm">Stock: {p.stock}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ORDERS */}
      {renderOrderTable("Pending Orders", pendingOrders, "yellow")}
      {renderOrderTable("Approved Orders", approvedOrders, "green")}
      {renderOrderTable("Rejected Orders", rejectedOrders, "red")}
    </div>
  );
};

export default VendorDashboard;
