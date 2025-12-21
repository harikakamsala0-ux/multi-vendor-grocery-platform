import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package, ShoppingBag, Store, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // --------------------------
  // FETCH ALL BACKEND DATA
  // --------------------------
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/orders/all/");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/products/");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOrders();
    fetchProducts();
  }, []);

  // --------------------------
  // STATS CALCULATIONS
  // --------------------------
  const vendors = users.filter((u) => u.role === "vendor");
  const customers = users.filter((u) => u.role === "customer");

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);

  const stats = [
    {
      title: "Total Vendors",
      value: vendors.length,
      icon: Store,
      color: "text-primary",
    },
    {
      title: "Total Customers",
      value: customers.length,
      icon: Users,
      color: "text-secondary",
    },
    {
      title: "Total Products",
      value: products.length,
      icon: Package,
      color: "text-accent",
    },
    {
      title: "Total Orders",
      value: orders.length,
      icon: ShoppingBag,
      color: "text-primary",
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue}`,
      icon: DollarSign,
      color: "text-secondary",
    },
    {
      title: "Categories",
      value: new Set(products.map((p) => p.category)).size,
      icon: TrendingUp,
      color: "text-accent",
    },
  ];

  // --------------------------
  // Vendor Stats
  // --------------------------
  const getVendorProducts = (vendorId: string) =>
    products.filter((p) => p.vendor_id === vendorId);

  const getVendorOrders = (vendorId: string) =>
    orders.filter((o) => o.vendor_id === vendorId);

  // --------------------------
  // Customer Orders
  // --------------------------
  const getCustomerOrders = (customerId: string) =>
    orders.filter((o) => o.customer_id === customerId);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Platform overview and management
        </p>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN TABS */}
        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-muted">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          {/* ---------------------- */}
          {/* VENDOR MANAGEMENT TAB */}
          {/* ---------------------- */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle>Vendors</CardTitle>
                <CardDescription>Vendor accounts, products & orders</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {vendors.map((vendor) => {
                  const vendorProducts = getVendorProducts(vendor._id);
                  const vendorOrders = getVendorOrders(vendor._id);

                  return (
                    <Card key={vendor._id} className="p-4 border">
                      <h2 className="font-semibold text-lg">{vendor.name}</h2>
                      <p className="text-sm text-gray-600">{vendor.email}</p>

                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <Badge variant="secondary">Products: {vendorProducts.length}</Badge>
                        <Badge variant="outline">Orders: {vendorOrders.length}</Badge>
                        <Badge variant="default">
                          Approved: {vendorOrders.filter((o) => o.status === "approved").length}
                        </Badge>
                      </div>

                      {/* Vendor Product List */}
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Products:</h3>
                        {vendorProducts.length === 0 ? (
                          <p className="text-gray-500 text-sm">No products added.</p>
                        ) : (
                          vendorProducts.map((p) => (
                            <div key={p._id} className="p-2 border rounded text-sm mb-2">
                              {p.name} • ₹{p.price} • Stock: {p.stock}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Vendor Order List */}
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Orders:</h3>
                        {vendorOrders.length === 0 ? (
                          <p className="text-gray-500 text-sm">No orders yet.</p>
                        ) : (
                          vendorOrders.map((o) => (
                            <div key={o._id} className="p-2 border rounded text-sm mb-2">
                              {o.product_name} • Qty: {o.quantity} • Status: {o.status}
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------- */}
          {/* CUSTOMER MANAGEMENT TAB */}
          {/* ---------------------- */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Customer accounts & order history</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {customers.map((customer) => {
                  const customerOrders = getCustomerOrders(customer._id);

                  return (
                    <Card key={customer._id} className="p-4 border">
                      <h2 className="font-semibold">{customer.name}</h2>
                      <p className="text-sm text-gray-600">{customer.email}</p>

                      <Badge className="my-2" variant="secondary">
                        {customerOrders.length} Orders
                      </Badge>

                      <div className="mt-3">
                        <h3 className="font-semibold mb-2">Order History:</h3>

                        {customerOrders.length === 0 ? (
                          <p className="text-gray-500 text-sm">No orders yet.</p>
                        ) : (
                          customerOrders.map((o) => (
                            <div key={o._id} className="p-2 border rounded text-sm mb-2">
                              {o.product_name} • Vendor: {o.vendor_name} • Status: {o.status}
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------- */}
          {/* ALL ORDERS TAB */}
          {/* ---------------------- */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>Platform-wide order monitoring</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {orders.map((order) => (
                  <Card key={order._id} className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{order.product_name}</h3>
                        <p className="text-sm text-gray-600">
                          Customer: {order.customer_name} <br />
                          Vendor: {order.vendor_name}
                        </p>
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------- */}
          {/* PRODUCTS TAB */}
          {/* ---------------------- */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>Full platform catalog</CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product._id} className="p-4 border">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded"
                    />

                    <h3 className="font-semibold mt-2">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Vendor: {product.vendor_name}
                    </p>

                    <div className="flex justify-between mt-2 text-sm">
                      <Badge variant="secondary">₹{product.price}</Badge>
                      <Badge variant="outline">Stock: {product.stock}</Badge>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
