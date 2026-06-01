import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { categoryOptions } from "@/data/categoriesList";
import {
  Star,
  Store,
  Package,
  ClipboardList,
  PlusCircle,
  ShoppingCart,
  User,
  Info,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";

const API = "http://127.0.0.1:8000/api";

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
  const [reviewStats, setReviewStats] = useState<{
    average_rating: number | null;
    count: number;
    reviews: Array<{
      _id: string;
      customer_name: string;
      rating: number;
      comment: string;
      created_at?: string;
    }>;
  } | null>(null);
  const [demandForecast, setDemandForecast] = useState<
    Array<{
      product_id: string;
      name: string;
      predicted_demand_next_7d_units: number;
      engagement_14d: number;
      stock: number;
      suggested_restock_if_below_prediction: number;
    }>
  >([]);

  const fetchDemand = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API}/vendor/${user.id}/demand_forecast/`);
      if (res.ok) {
        const data = await res.json();
        setDemandForecast(Array.isArray(data.forecasts) ? data.forecasts : []);
      }
    } catch {
      /* optional */
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API}/orders/${user?.id}/`);
      if (res.ok) setOrders(await res.json());
    } catch {
      toast.error("Failed to load orders");
    }
  };

  const fetchVendorProducts = async () => {
    try {
      const res = await fetch(`${API}/products/vendor/${user?.id}/`);
      if (res.ok) setProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    }
  };

  const fetchVendorReviews = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API}/reviews/vendor/${user.id}/`);
      if (res.ok) setReviewStats(await res.json());
    } catch {
      toast.error("Failed to load reviews");
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchVendorProducts();
      fetchVendorReviews();
      fetchDemand();
      const interval = setInterval(() => {
        fetchOrders();
        fetchVendorProducts();
        fetchVendorReviews();
        fetchDemand();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, vendor_id: user?.id };
    try {
      const res = await fetch(`${API}/add_product/`, {
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
        fetchVendorProducts();
      }
    } catch {
      toast.error("Network error.");
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API}/update_order_status/`, {
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

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const approvedOrders = orders.filter((o) => o.status === "approved");
  const rejectedOrders = orders.filter((o) => o.status === "rejected");

  const revenue = useMemo(
    () =>
      approvedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0),
    [approvedOrders]
  );

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  const OrderList = ({ data, showActions }: { data: any[]; showActions: boolean }) => (
    <div className="space-y-4">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No orders in this tab.</p>
      ) : (
        data.map((order) => (
          <div
            key={order._id}
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {order.product_name}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {order.customer_name}
                </span>
                <span>Qty {order.quantity}</span>
                <span className="font-semibold text-foreground">₹{order.total_price}</span>
              </div>
            </div>
            {showActions && order.status === "pending" ? (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  onClick={() => handleUpdateStatus(order._id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-lg"
                  onClick={() => handleUpdateStatus(order._id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <Badge
                variant={order.status === "approved" ? "secondary" : "destructive"}
                className="w-fit capitalize"
              >
                {order.status}
              </Badge>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-500/5 via-background to-background">
      <div className="relative border-b bg-card/70 backdrop-blur-md overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_-10%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="container max-w-6xl mx-auto px-4 py-10 md:py-12 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg">
                <Store className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor hub
                </p>
                <h1 className="text-3xl font-bold tracking-tight">{user?.name}</h1>
                <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold border-2 border-background shadow">
                {initial}
              </div>
              <Button variant="outline" asChild className="rounded-xl">
                <Link to="/products">View storefront</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
            <div className="rounded-xl border bg-background/90 backdrop-blur px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Package className="h-4 w-4" />
                Products listed
              </div>
              <p className="text-2xl font-bold tabular-nums">{products.length}</p>
            </div>
            <div className="rounded-xl border bg-background/90 backdrop-blur px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <ClipboardList className="h-4 w-4" />
                Pending orders
              </div>
              <p className="text-2xl font-bold tabular-nums text-amber-600">{pendingOrders.length}</p>
            </div>
            <div className="rounded-xl border bg-background/90 backdrop-blur px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Star className="h-4 w-4" />
                Avg. rating
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {reviewStats?.average_rating ?? "—"}
                {reviewStats && reviewStats.count > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({reviewStats.count})
                  </span>
                ) : null}
              </p>
            </div>
            <div className="rounded-xl border bg-background/90 backdrop-blur px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                Revenue (approved)
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">₹{revenue.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 pt-6">
        {user?.email?.endsWith("@seed.freshcart") ? (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertTitle>Demo vendor account</AlertTitle>
            <AlertDescription>
              Seeded catalog products are tied to the four <code className="text-xs bg-muted px-1 rounded">@seed.freshcart</code>{" "}
              vendors (password <code className="text-xs bg-muted px-1 rounded">seed123</code>). Your dashboard only lists
              products you added as this vendor; open <Link to="/products" className="font-medium text-primary underline">Shop</Link>{" "}
              to see all vendors&apos; listings.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10 space-y-10">
        <Card className="border-emerald-500/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <CardTitle>Demand forecast (AI-style)</CardTitle>
            </div>
            <CardDescription>
              Heuristic model from recent views, cart adds, and lifetime sales — suitable for academic demo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {demandForecast.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products or not enough activity yet. Add products and encourage customer engagement.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">14d engagement</th>
                      <th className="py-2 pr-4">Pred. 7d units</th>
                      <th className="py-2 pr-4">Stock</th>
                      <th className="py-2">Restock hint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandForecast.slice(0, 12).map((row) => (
                      <tr key={row.product_id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{row.name}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.engagement_14d}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.predicted_demand_next_7d_units}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.stock}</td>
                        <td className="py-2 tabular-nums text-amber-700">
                          {row.suggested_restock_if_below_prediction > 0
                            ? `+${row.suggested_restock_if_below_prediction}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <CardTitle>Customer reviews</CardTitle>
            </div>
            <CardDescription>Feedback from buyers who completed approved orders</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewStats === null ? (
              <p className="text-muted-foreground text-sm">Loading reviews…</p>
            ) : reviewStats.count === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 py-10 text-center text-muted-foreground text-sm">
                No reviews yet. Approved orders let customers rate your store.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "h-7 w-7",
                          reviewStats.average_rating != null &&
                            n <= Math.round(reviewStats.average_rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/25"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold">{reviewStats.average_rating}</span>
                </div>
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {reviewStats.reviews.map((r) => (
                    <li
                      key={r._id}
                      className="rounded-xl border bg-muted/20 p-4 text-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold">{r.customer_name || "Customer"}</span>
                        <div className="flex gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3.5 w-3.5",
                                i < r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/25"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment ? <p className="text-muted-foreground mt-2 leading-relaxed">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              <CardTitle>Add new product</CardTitle>
            </div>
            <CardDescription>List inventory for customers — include a high-quality image URL</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product name</label>
                  <Input
                    name="name"
                    placeholder="e.g. Organic tomatoes"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (₹)</label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.price}
                    onChange={handleInputChange}
                    required
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stock</label>
                  <Input
                    name="stock"
                    type="number"
                    placeholder="0"
                    value={form.stock}
                    onChange={handleInputChange}
                    required
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  name="image"
                  placeholder="https://images.unsplash.com/..."
                  value={form.image}
                  onChange={handleInputChange}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  name="description"
                  placeholder="Describe your product..."
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="rounded-lg resize-none"
                />
              </div>
              <Button type="submit" size="lg" className="rounded-xl w-full sm:w-auto">
                <PlusCircle className="h-4 w-4 mr-2" />
                Publish product
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Your catalog ({products.length})</CardTitle>
            <CardDescription>Products visible to customers on the marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                No products yet. Add your first listing above.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div
                    key={p._id}
                    className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      <img
                        src={resolveProductImageUrl(p)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-muted"
                        onError={handleProductImageError}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold leading-tight line-clamp-2">{p.name}</h3>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {p.category}
                      </Badge>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-lg font-bold text-primary">₹{p.price}</span>
                        <span className="text-sm text-muted-foreground">{p.stock} in stock</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Order requests</CardTitle>
            <CardDescription>Approve or reject customer orders — totals refresh every few seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md rounded-xl h-11">
                <TabsTrigger value="pending" className="rounded-lg">
                  Pending ({pendingOrders.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="rounded-lg">
                  Approved ({approvedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-lg">
                  Rejected ({rejectedOrders.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-6">
                <OrderList data={pendingOrders} showActions />
              </TabsContent>
              <TabsContent value="approved" className="mt-6">
                <OrderList data={approvedOrders} showActions={false} />
              </TabsContent>
              <TabsContent value="rejected" className="mt-6">
                <OrderList data={rejectedOrders} showActions={false} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDashboard;
