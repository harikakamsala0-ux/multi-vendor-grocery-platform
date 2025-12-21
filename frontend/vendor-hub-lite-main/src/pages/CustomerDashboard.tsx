import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetch(`http://127.0.0.1:8000/api/orders/customer/${user.id}/`)
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => toast.error("Failed to load your orders"));
  }, [user]);

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

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Customer Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>Track your recent requests</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-500">No orders yet.</p>
          ) : (
            orders.map((order: any) => {
              const Icon = getStatusIcon(order.status);
              return (
                <div key={order._id} className="border p-4 rounded-lg mb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{order.product_name}</h3>
                      <p className="text-sm text-gray-500">
                        Vendor: {order.vendor_name} | Qty: {order.quantity} | ₹{order.total_price}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(order.status)}>
                      <Icon className="h-3 w-3 mr-1" />
                      {order.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
