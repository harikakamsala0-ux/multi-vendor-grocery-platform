import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "http://127.0.0.1:8000/api";

interface OrderRow {
  _id: string;
  vendor_id: string;
  vendor_name: string;
  product_name: string;
  quantity: number;
  total_price: number;
  status: string;
}

interface MyReview {
  _id: string;
  vendor_id: string;
  vendor_name: string;
  rating: number;
  comment: string;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeVendor, setActiveVendor] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(() => {
    if (!user) return;
    fetch(`${API}/orders/customer/${user.id}/`)
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => toast.error("Failed to load your orders"));
  }, [user]);

  const loadMyReviews = useCallback(() => {
    if (!user) return;
    fetch(`${API}/reviews/customer/${user.id}/`)
      .then((res) => res.json())
      .then(setMyReviews)
      .catch(() => toast.error("Failed to load your reviews"));
  }, [user]);

  useEffect(() => {
    loadOrders();
    loadMyReviews();
  }, [loadOrders, loadMyReviews]);

  const reviewByVendorId = useMemo(() => {
    const m = new Map<string, MyReview>();
    myReviews.forEach((r) => m.set(r.vendor_id, r));
    return m;
  }, [myReviews]);

  const rateableVendors = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    orders.forEach((o) => {
      if (o.status === "approved" && o.vendor_id) {
        if (!map.has(o.vendor_id)) {
          map.set(o.vendor_id, { id: o.vendor_id, name: o.vendor_name || "Vendor" });
        }
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const approved = orders.filter((o) => o.status === "approved").length;
    const rejected = orders.filter((o) => o.status === "rejected").length;
    return { total: orders.length, pending, approved, rejected };
  }, [orders]);

  const openReviewDialog = (v: { id: string; name: string }) => {
    setActiveVendor(v);
    const existing = reviewByVendorId.get(v.id);
    setRating(existing?.rating ?? 5);
    setComment(existing?.comment ?? "");
    setDialogOpen(true);
  };

  const submitReview = async () => {
    if (!user || !activeVendor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: user.id,
          vendor_id: activeVendor.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save review");
        return;
      }
      toast.success(data.message || "Review saved");
      setDialogOpen(false);
      loadMyReviews();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return Clock;
      case "approved":
        return CheckCircle;
      case "rejected":
        return XCircle;
      default:
        return Package;
    }
  };

  const statusBorder = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-amber-500";
      case "approved":
        return "border-l-emerald-500";
      case "rejected":
        return "border-l-rose-500";
      default:
        return "border-l-muted-foreground";
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="relative overflow-hidden border-b bg-card/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="container max-w-6xl mx-auto px-4 py-10 md:py-12 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg">
                {initial}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Customer space
                </p>
                <h1 className="text-3xl font-bold tracking-tight">Hello, {user?.name}</h1>
                <p className="text-muted-foreground mt-1">{user?.email}</p>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-xl shadow-md">
              <Link to="/products">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Continue shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
            {[
              { label: "Total orders", value: stats.total, icon: Package },
              { label: "Pending", value: stats.pending, icon: Clock },
              { label: "Approved", value: stats.approved, icon: CheckCircle },
              { label: "Reviews", value: myReviews.length, icon: Star },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border bg-background/80 backdrop-blur px-4 py-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10 space-y-10">
        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-amber-400 to-primary" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle>Rate vendors</CardTitle>
            </div>
            <CardDescription>
              After a vendor approves your order, you can leave a star rating and optional comment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rateableVendors.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No approved orders yet — once a vendor approves an order, you can review them here.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/products">Browse products</Link>
                </Button>
              </div>
            ) : (
              <ul className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                {rateableVendors.map((v) => {
                  const existing = reviewByVendorId.get(v.id);
                  return (
                    <li
                      key={v.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div>
                        <p className="font-semibold text-lg">{v.name}</p>
                        {existing ? (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-4 w-4",
                                  i < existing.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                            <span className="ml-1">Your review</span>
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Not rated yet</p>
                        )}
                      </div>
                      <Button
                        variant={existing ? "outline" : "default"}
                        className="rounded-lg shrink-0"
                        onClick={() => openReviewDialog(v)}
                      >
                        {existing ? "Edit review" : "Rate vendor"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Your orders</CardTitle>
            <CardDescription>Track your recent purchase requests</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">You haven&apos;t placed any orders yet.</p>
                <Button asChild>
                  <Link to="/products">Explore products</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => {
                  const Icon = getStatusIcon(order.status);
                  return (
                    <div
                      key={order._id}
                      className={cn(
                        "rounded-xl border bg-card p-5 shadow-sm border-l-4 transition-shadow hover:shadow-md",
                        statusBorder(order.status)
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{order.product_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Vendor: <span className="text-foreground">{order.vendor_name}</span>
                          </p>
                          <p className="text-sm">
                            Qty <span className="font-medium">{order.quantity}</span>
                            <span className="mx-2 text-muted-foreground">·</span>
                            <span className="font-semibold text-primary">₹{order.total_price}</span>
                          </p>
                        </div>
                        <Badge variant={getStatusColor(order.status)} className="h-8 px-3 gap-1 w-fit">
                          <Icon className="h-3.5 w-3.5" />
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Review {activeVendor?.name}</DialogTitle>
            <DialogDescription>
              Share your experience. One review per vendor; you can update it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1 rounded-md hover:bg-muted"
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-comment">Comment (optional)</Label>
              <Textarea
                id="review-comment"
                className="mt-2 rounded-xl"
                rows={4}
                placeholder="What went well?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submitting} className="rounded-lg">
              {submitting ? "Saving…" : "Save review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
