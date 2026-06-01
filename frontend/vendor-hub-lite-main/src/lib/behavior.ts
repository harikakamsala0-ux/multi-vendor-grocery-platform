const API = "http://127.0.0.1:8000/api";

export type BehaviorEventType =
  | "product_view"
  | "order_intent"
  | "product_impression"
  | "category_filter"
  | "category_browse"
  | "search"
  | "add_to_cart";

/** Fire-and-forget event for personalization (no UI impact on failure). */
export function trackBehaviorEvent(
  userId: string,
  eventType: BehaviorEventType,
  payload?: {
    product_id?: string;
    category?: string;
    vendor_id?: string;
    query?: string;
  }
): void {
  void fetch(`${API}/events/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      event_type: eventType,
      ...payload,
    }),
  }).catch(() => {});
}
